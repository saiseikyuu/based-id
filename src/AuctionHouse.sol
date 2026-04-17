// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Based ID Auction House
/// @notice Sequential English auctions for Based ID #1–#100 (auction reserve).
///
/// Deployment sequence:
///   1. Deploy BasedID → call ownerMint(auctionWallet) to secure #1–#100
///   2. Deploy AuctionHouse(basedIdAddress, usdcAddress, treasury)
///   3. From auctionWallet: call basedId.setApprovalForAll(auctionHouse, true)
///   4. Call createAuction(tokenId, reservePrice, duration) to start bidding
///
/// Each auction:
///   - Bids in USDC (6 decimals, same as public mint)
///   - Minimum first bid = reservePrice
///   - Each subsequent bid must exceed top bid by MIN_INCREMENT_BPS (5%)
///   - If a bid arrives within ANTI_SNIPE_WINDOW of end time, extend by ANTI_SNIPE_EXT
///   - When settled: NFT → winner, USDC → treasury, previous bids auto-refunded
///
contract AuctionHouse is Ownable, ReentrancyGuard {

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Minimum outbid increment: 5% above current top bid.
    uint256 public constant MIN_INCREMENT_BPS = 500; // 5%

    /// @notice If a bid arrives within this window before auction end, extend it.
    uint256 public constant ANTI_SNIPE_WINDOW = 15 minutes;

    /// @notice How much extra time is added when anti-snipe triggers.
    uint256 public constant ANTI_SNIPE_EXT = 15 minutes;

    /// @notice Maximum auction duration: 7 days.
    uint256 public constant MAX_DURATION = 7 days;

    /// @notice Minimum auction duration: 1 hour.
    uint256 public constant MIN_DURATION = 1 hours;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice The Based ID NFT contract.
    IERC721 public immutable basedId;

    /// @notice USDC token used for bidding.
    IERC20  public immutable usdc;

    /// @notice Address that receives USDC proceeds from settled auctions.
    address public treasury;

    struct Auction {
        address seller;       // wallet that holds the NFT (must approve this contract)
        address topBidder;    // current highest bidder (address(0) if none)
        uint256 topBid;       // current highest bid in USDC (0 if none)
        uint256 reservePrice; // minimum first bid (USDC, 6 decimals)
        uint256 startTime;    // block.timestamp when created
        uint256 endTime;      // block.timestamp when bidding closes
        bool    settled;      // true once NFT + funds have been distributed
    }

    /// @notice tokenId → Auction data.
    mapping(uint256 => Auction) public auctions;

    /// @notice tokenId → list of past bidders with amounts, for refund tracking.
    /// Only the most recent non-winning bid is held; previous bids are auto-refunded.

    // ─── Events ──────────────────────────────────────────────────────────────

    event AuctionCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 reservePrice,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount,
        uint256 newEndTime
    );

    event AuctionSettled(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 amount
    );

    event AuctionCancelled(uint256 indexed tokenId);

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(
        address basedIdAddress,
        address usdcAddress,
        address _treasury,
        address initialOwner
    ) Ownable(initialOwner) {
        require(basedIdAddress != address(0), "Invalid NFT address");
        require(usdcAddress    != address(0), "Invalid USDC address");
        require(_treasury      != address(0), "Invalid treasury");

        basedId  = IERC721(basedIdAddress);
        usdc     = IERC20(usdcAddress);
        treasury = _treasury;
    }

    // ─── Owner: Create Auction ────────────────────────────────────────────────

    /// @notice Start an auction for a Based ID auction-reserve token.
    /// @param tokenId      The token ID to auction (must be #1–#100).
    /// @param reservePrice Minimum first bid in USDC (6 decimals). E.g. 10_000_000 = $10.
    /// @param duration     Auction length in seconds (between MIN_DURATION and MAX_DURATION).
    ///
    /// Requirements:
    ///   - Caller is owner.
    ///   - No active (unsettled) auction for this tokenId.
    ///   - This contract is approved to transfer the token (setApprovalForAll).
    function createAuction(
        uint256 tokenId,
        uint256 reservePrice,
        uint256 duration
    ) external onlyOwner {
        require(auctions[tokenId].endTime == 0 || auctions[tokenId].settled,
            "Auction already active");
        require(reservePrice > 0,                         "Reserve price must be > 0");
        require(duration >= MIN_DURATION,                 "Duration too short");
        require(duration <= MAX_DURATION,                 "Duration too long");

        address seller = basedId.ownerOf(tokenId);
        require(
            basedId.isApprovedForAll(seller, address(this)) ||
            basedId.getApproved(tokenId) == address(this),
            "AuctionHouse not approved"
        );

        uint256 start = block.timestamp;
        uint256 end   = start + duration;

        auctions[tokenId] = Auction({
            seller:       seller,
            topBidder:    address(0),
            topBid:       0,
            reservePrice: reservePrice,
            startTime:    start,
            endTime:      end,
            settled:      false
        });

        emit AuctionCreated(tokenId, seller, reservePrice, start, end);
    }

    // ─── Bid ──────────────────────────────────────────────────────────────────

    /// @notice Place or raise a bid on an active auction.
    /// @param tokenId  The token being auctioned.
    /// @param amount   USDC amount to bid (6 decimals). Must be >= reservePrice (first bid)
    ///                 or at least 5% above current top bid (subsequent bids).
    ///
    /// The USDC is pulled from the caller immediately. The previous top bidder is
    /// refunded in the same transaction.
    function bid(uint256 tokenId, uint256 amount) external nonReentrant {
        Auction storage a = auctions[tokenId];

        require(a.endTime > 0,            "Auction does not exist");
        require(!a.settled,               "Auction already settled");
        require(block.timestamp < a.endTime, "Auction ended");

        // First bid must meet reserve; subsequent bids must exceed by MIN_INCREMENT_BPS
        if (a.topBidder == address(0)) {
            require(amount >= a.reservePrice, "Below reserve price");
        } else {
            uint256 minNext = a.topBid + (a.topBid * MIN_INCREMENT_BPS) / 10_000;
            require(amount >= minNext, "Bid too low (min 5% increment)");
        }

        // Pull new bid from caller
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );

        // Update state before external refund call (CEI pattern)
        address prevBidder = a.topBidder;
        uint256 prevBid    = a.topBid;
        a.topBidder = msg.sender;
        a.topBid    = amount;

        // Anti-snipe: extend if bid lands in last ANTI_SNIPE_WINDOW
        if (a.endTime - block.timestamp < ANTI_SNIPE_WINDOW) {
            a.endTime = block.timestamp + ANTI_SNIPE_EXT;
        }

        // Refund previous top bidder (after state is updated)
        if (prevBidder != address(0) && prevBid > 0) {
            require(usdc.transfer(prevBidder, prevBid), "Refund failed");
        }

        emit BidPlaced(tokenId, msg.sender, amount, a.endTime);
    }

    // ─── Settle ───────────────────────────────────────────────────────────────

    /// @notice Settle an ended auction: transfer NFT to winner, USDC to treasury.
    ///         If no bids were placed, the NFT stays with the seller (no transfer).
    ///         Callable by anyone once endTime has passed.
    function settle(uint256 tokenId) external nonReentrant {
        Auction storage a = auctions[tokenId];

        require(a.endTime > 0,            "Auction does not exist");
        require(!a.settled,               "Already settled");
        require(block.timestamp >= a.endTime, "Auction not ended yet");

        a.settled = true;

        if (a.topBidder != address(0)) {
            // Transfer NFT from seller to winner
            basedId.transferFrom(a.seller, a.topBidder, tokenId);

            // Send USDC to treasury
            require(usdc.transfer(treasury, a.topBid), "Treasury transfer failed");

            emit AuctionSettled(tokenId, a.topBidder, a.topBid);
        } else {
            // No bids — auction expires with no sale
            emit AuctionSettled(tokenId, address(0), 0);
        }
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────

    /// @notice Cancel an auction that has no bids yet. Owner only.
    function cancelAuction(uint256 tokenId) external onlyOwner {
        Auction storage a = auctions[tokenId];

        require(a.endTime > 0,            "Auction does not exist");
        require(!a.settled,               "Already settled");
        require(a.topBidder == address(0), "Cannot cancel: bids already placed");

        a.settled = true; // mark as done so a new auction can be created
        emit AuctionCancelled(tokenId);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Update the treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Recover ETH accidentally sent here.
    receive() external payable {}

    function recoverETH() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH");
        (bool ok,) = owner().call{value: bal}("");
        require(ok, "ETH transfer failed");
    }

    /// @notice Recover any ERC20 accidentally sent here (NOT auction USDC bids).
    function recoverERC20(address token) external onlyOwner {
        require(token != address(usdc), "Use settle() to move USDC");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "No tokens");
        require(IERC20(token).transfer(owner(), bal), "Transfer failed");
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Returns true if an auction is currently active (created, not settled, not expired).
    function isActive(uint256 tokenId) external view returns (bool) {
        Auction storage a = auctions[tokenId];
        return a.endTime > 0 && !a.settled && block.timestamp < a.endTime;
    }

    /// @notice Returns the minimum valid next bid amount for an active auction.
    ///         Returns reservePrice if no bids yet; otherwise topBid + 5%.
    function minNextBid(uint256 tokenId) external view returns (uint256) {
        Auction storage a = auctions[tokenId];
        if (a.topBidder == address(0)) return a.reservePrice;
        return a.topBid + (a.topBid * MIN_INCREMENT_BPS) / 10_000;
    }

    /// @notice Returns time remaining in seconds (0 if ended or not started).
    function timeRemaining(uint256 tokenId) external view returns (uint256) {
        Auction storage a = auctions[tokenId];
        if (a.endTime == 0 || block.timestamp >= a.endTime) return 0;
        return a.endTime - block.timestamp;
    }
}
