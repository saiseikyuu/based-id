// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BasedID.sol";
import "../src/AuctionHouse.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal mock USDC (6 decimals) for testing.
contract MockUSDC2 is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract AuctionHouseTest is Test {
    BasedID     public basedId;
    MockUSDC2   public usdc;
    AuctionHouse public house;

    address public owner    = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public alice    = makeAddr("alice");
    address public bob      = makeAddr("bob");
    address public carol    = makeAddr("carol");

    uint256 constant RESERVE_PRICE  = 10_000_000; // $10 USDC
    uint256 constant ONE_DAY        = 1 days;
    uint256 constant AUCTION_RESERVE = 100;

    // ─── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc    = new MockUSDC2();
        basedId = new BasedID(address(usdc), owner);
        house   = new AuctionHouse(address(basedId), address(usdc), treasury, owner);

        // Fund bidders
        usdc.mint(alice, 1_000_000_000); // $1000
        usdc.mint(bob,   1_000_000_000);
        usdc.mint(carol, 1_000_000_000);

        // Deployment sequence:
        // 1. owner mints #1–#100 to themselves (auction wallet)
        // 2. owner approves AuctionHouse to transfer those NFTs
        // 3. public mint remains paused (not needed for auction tests)
        vm.startPrank(owner);
        basedId.ownerMint(owner);
        basedId.setApprovalForAll(address(house), true);
        vm.stopPrank();
    }

    // ─── Deployment state ────────────────────────────────────────────────────

    function test_DeploymentState() public view {
        assertEq(address(house.basedId()),  address(basedId));
        assertEq(address(house.usdc()),     address(usdc));
        assertEq(house.treasury(),          treasury);
        assertEq(house.owner(),             owner);
        assertEq(house.MIN_INCREMENT_BPS(), 500);
        assertEq(house.ANTI_SNIPE_WINDOW(), 15 minutes);
    }

    function test_RevertDeployWithZeroNFT() public {
        vm.expectRevert("Invalid NFT address");
        new AuctionHouse(address(0), address(usdc), treasury, owner);
    }

    function test_RevertDeployWithZeroUSDC() public {
        vm.expectRevert("Invalid USDC address");
        new AuctionHouse(address(basedId), address(0), treasury, owner);
    }

    function test_RevertDeployWithZeroTreasury() public {
        vm.expectRevert("Invalid treasury");
        new AuctionHouse(address(basedId), address(usdc), address(0), owner);
    }

    // ─── createAuction ───────────────────────────────────────────────────────

    function test_CreateAuction() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        (
            address seller,
            address topBidder,
            uint256 topBid,
            uint256 reservePrice,
            uint256 startTime,
            uint256 endTime,
            bool settled
        ) = house.auctions(1);

        assertEq(seller,       owner);
        assertEq(topBidder,    address(0));
        assertEq(topBid,       0);
        assertEq(reservePrice, RESERVE_PRICE);
        assertEq(startTime,    block.timestamp);
        assertEq(endTime,      block.timestamp + ONE_DAY);
        assertFalse(settled);
    }

    function test_CreateAuctionEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit AuctionHouse.AuctionCreated(1, owner, RESERVE_PRICE, block.timestamp, block.timestamp + ONE_DAY);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
    }

    function test_RevertCreateAuctionNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
    }

    function test_RevertCreateAuctionZeroReserve() public {
        vm.prank(owner);
        vm.expectRevert("Reserve price must be > 0");
        house.createAuction(1, 0, ONE_DAY);
    }

    function test_RevertCreateAuctionTooShort() public {
        vm.prank(owner);
        vm.expectRevert("Duration too short");
        house.createAuction(1, RESERVE_PRICE, 30 minutes);
    }

    function test_RevertCreateAuctionTooLong() public {
        vm.prank(owner);
        vm.expectRevert("Duration too long");
        house.createAuction(1, RESERVE_PRICE, 8 days);
    }

    function test_RevertCreateAuctionAlreadyActive() public {
        vm.startPrank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
        vm.expectRevert("Auction already active");
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
        vm.stopPrank();
    }

    function test_CanRecreateAuctionAfterSettle() public {
        // Create → no bids → expire → settle → create again
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.warp(block.timestamp + ONE_DAY + 1);
        house.settle(1);

        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY); // should not revert
    }

    function test_RevertCreateAuctionNotApproved() public {
        // Revoke approval then try to create
        vm.prank(owner);
        basedId.setApprovalForAll(address(house), false);

        vm.prank(owner);
        vm.expectRevert("AuctionHouse not approved");
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
    }

    // ─── isActive / minNextBid / timeRemaining ────────────────────────────────

    function test_IsActive() public {
        assertFalse(house.isActive(1)); // no auction yet

        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
        assertTrue(house.isActive(1));

        vm.warp(block.timestamp + ONE_DAY + 1);
        assertFalse(house.isActive(1)); // expired
    }

    function test_MinNextBid_NoExistingBids() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);
        assertEq(house.minNextBid(1), RESERVE_PRICE);
    }

    function test_MinNextBid_WithExistingBid() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        // Min next = 10_000_000 + 5% = 10_500_000
        assertEq(house.minNextBid(1), 10_500_000);
    }

    function test_TimeRemaining() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        uint256 remaining = house.timeRemaining(1);
        assertApproxEqAbs(remaining, ONE_DAY, 2); // within 2 seconds

        vm.warp(block.timestamp + ONE_DAY + 1);
        assertEq(house.timeRemaining(1), 0);
    }

    // ─── bid ──────────────────────────────────────────────────────────────────

    function test_FirstBidAtReserve() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        (, address topBidder, uint256 topBid,,,, ) = house.auctions(1);
        assertEq(topBidder, alice);
        assertEq(topBid, RESERVE_PRICE);
        assertEq(usdc.balanceOf(alice), aliceBefore - RESERVE_PRICE);
        assertEq(usdc.balanceOf(address(house)), RESERVE_PRICE);
    }

    function test_BidEmitsEvent() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        vm.expectEmit(true, true, false, false);
        emit AuctionHouse.BidPlaced(1, alice, RESERVE_PRICE, 0);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();
    }

    function test_OutbidRefundsPreviousBidder() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        uint256 aliceBefore = usdc.balanceOf(alice);

        // Alice bids $10
        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        uint256 bobBid = 11_000_000; // $11 (> 10 + 5%)

        // Bob outbids
        vm.startPrank(bob);
        usdc.approve(address(house), bobBid);
        house.bid(1, bobBid);
        vm.stopPrank();

        // Alice fully refunded
        assertEq(usdc.balanceOf(alice), aliceBefore);
        // Contract holds only Bob's bid
        assertEq(usdc.balanceOf(address(house)), bobBid);

        (, address topBidder, uint256 topBid,,,, ) = house.auctions(1);
        assertEq(topBidder, bob);
        assertEq(topBid, bobBid);
    }

    function test_RevertBidBelowReserve() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE - 1);
        vm.expectRevert("Below reserve price");
        house.bid(1, RESERVE_PRICE - 1);
        vm.stopPrank();
    }

    function test_RevertBidInsufficientIncrement() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        // Need at least 10_500_000; offer 10_100_000 (only 1% above)
        uint256 lowBid = 10_100_000;
        vm.startPrank(bob);
        usdc.approve(address(house), lowBid);
        vm.expectRevert("Bid too low (min 5% increment)");
        house.bid(1, lowBid);
        vm.stopPrank();
    }

    function test_RevertBidOnNonExistentAuction() public {
        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        vm.expectRevert("Auction does not exist");
        house.bid(99, RESERVE_PRICE);
        vm.stopPrank();
    }

    function test_RevertBidAfterExpiry() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        vm.expectRevert("Auction ended");
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();
    }

    function test_AntiSnipeExtension() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        // Read the actual endTime from the contract (avoids timestamp assumptions)
        (,,,,,uint256 originalEnd,) = house.auctions(1);

        // Warp to 10 minutes before end (within ANTI_SNIPE_WINDOW of 15 min)
        vm.warp(originalEnd - 10 minutes);
        uint256 bidTime = block.timestamp; // = originalEnd - 10 min

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        (,,,,,uint256 endTime,) = house.auctions(1);
        // Anti-snipe: endTime = bidTime + ANTI_SNIPE_EXT (15 min)
        assertEq(endTime, bidTime + 15 minutes);
        assertGt(endTime, originalEnd); // extended past the original end
    }

    function test_NoBidNoExtension() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        uint256 expectedEnd = block.timestamp + ONE_DAY;

        // Bid with plenty of time left (1 hour before end — no extension)
        vm.warp(block.timestamp + ONE_DAY - 1 hours);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        (,,,,,uint256 endTime,) = house.auctions(1);
        assertEq(endTime, expectedEnd); // unchanged
    }

    // ─── settle ───────────────────────────────────────────────────────────────

    function test_SettleWithBid() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.warp(block.timestamp + ONE_DAY + 1);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        house.settle(1); // callable by anyone

        // NFT → alice
        assertEq(basedId.ownerOf(1), alice);

        // USDC → treasury
        assertEq(usdc.balanceOf(treasury), treasuryBefore + RESERVE_PRICE);
        assertEq(usdc.balanceOf(address(house)), 0);

        (,,,,,, bool settled) = house.auctions(1);
        assertTrue(settled);
    }

    function test_SettleEmitsEvent() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.warp(block.timestamp + ONE_DAY + 1);

        vm.expectEmit(true, true, false, true);
        emit AuctionHouse.AuctionSettled(1, alice, RESERVE_PRICE);
        house.settle(1);
    }

    function test_SettleNoBids_NftStaysWithSeller() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.warp(block.timestamp + ONE_DAY + 1);
        house.settle(1);

        // NFT stays with owner (seller)
        assertEq(basedId.ownerOf(1), owner);

        (,,,,,, bool settled) = house.auctions(1);
        assertTrue(settled);
    }

    function test_RevertSettleBeforeEnd() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.expectRevert("Auction not ended yet");
        house.settle(1);
    }

    function test_RevertSettleTwice() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.warp(block.timestamp + ONE_DAY + 1);
        house.settle(1);

        vm.expectRevert("Already settled");
        house.settle(1);
    }

    function test_SettleCallableByAnyone() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.warp(block.timestamp + ONE_DAY + 1);

        // Carol (random) settles
        vm.prank(carol);
        house.settle(1); // should not revert
        assertEq(basedId.ownerOf(1), alice);
    }

    // ─── cancelAuction ───────────────────────────────────────────────────────

    function test_CancelAuctionNoBids() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.prank(owner);
        house.cancelAuction(1);

        (,,,,,, bool settled) = house.auctions(1);
        assertTrue(settled);

        // NFT stays with owner
        assertEq(basedId.ownerOf(1), owner);
    }

    function test_CancelEmitsEvent() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit AuctionHouse.AuctionCancelled(1);
        house.cancelAuction(1);
    }

    function test_RevertCancelWithBids() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert("Cannot cancel: bids already placed");
        house.cancelAuction(1);
    }

    function test_RevertCancelNonOwner() public {
        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        vm.prank(alice);
        vm.expectRevert();
        house.cancelAuction(1);
    }

    // ─── setTreasury ──────────────────────────────────────────────────────────

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit AuctionHouse.TreasuryUpdated(treasury, newTreasury);
        house.setTreasury(newTreasury);
        assertEq(house.treasury(), newTreasury);
    }

    function test_RevertSetTreasuryZero() public {
        vm.prank(owner);
        vm.expectRevert("Invalid treasury");
        house.setTreasury(address(0));
    }

    function test_RevertSetTreasuryNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        house.setTreasury(alice);
    }

    // ─── Multiple simultaneous auctions ──────────────────────────────────────

    function test_MultipleAuctionsIndependent() public {
        vm.startPrank(owner);
        house.createAuction(1,  RESERVE_PRICE, ONE_DAY);
        house.createAuction(50, RESERVE_PRICE, ONE_DAY);
        house.createAuction(99, RESERVE_PRICE, ONE_DAY);
        vm.stopPrank();

        // Alice bids on #1, Bob on #50, Carol on #99
        vm.startPrank(alice);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(1, RESERVE_PRICE);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(50, RESERVE_PRICE);
        vm.stopPrank();

        vm.startPrank(carol);
        usdc.approve(address(house), RESERVE_PRICE);
        house.bid(99, RESERVE_PRICE);
        vm.stopPrank();

        vm.warp(block.timestamp + ONE_DAY + 1);

        house.settle(1);
        house.settle(50);
        house.settle(99);

        assertEq(basedId.ownerOf(1),  alice);
        assertEq(basedId.ownerOf(50), bob);
        assertEq(basedId.ownerOf(99), carol);
        assertEq(usdc.balanceOf(treasury), RESERVE_PRICE * 3);
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_BidSequence(uint8 rounds) public {
        vm.assume(rounds >= 2 && rounds <= 10);

        vm.prank(owner);
        house.createAuction(1, RESERVE_PRICE, ONE_DAY);

        address[2] memory bidders = [alice, bob];
        uint256 currentBid = RESERVE_PRICE;

        for (uint256 i = 0; i < rounds; i++) {
            address bidder = bidders[i % 2];
            // Each round: bid exactly 5% above current (minimum valid)
            uint256 nextBid = currentBid + (currentBid * 500) / 10_000;
            if (i == 0) nextBid = RESERVE_PRICE;

            vm.startPrank(bidder);
            usdc.approve(address(house), nextBid);
            house.bid(1, nextBid);
            vm.stopPrank();

            (, address topBidder, uint256 topBid,,,, ) = house.auctions(1);
            assertEq(topBidder, bidder);
            assertEq(topBid, nextBid);
            currentBid = nextBid;
        }

        // Settle and verify winner is last bidder
        vm.warp(block.timestamp + ONE_DAY + 1);
        house.settle(1);
        address expectedWinner = bidders[(rounds - 1) % 2];
        assertEq(basedId.ownerOf(1), expectedWinner);
    }
}
