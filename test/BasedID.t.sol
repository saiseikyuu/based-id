// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BasedID.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal mock USDC for testing (6 decimals like real USDC)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract BasedIDTest is Test {
    BasedID public basedID;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob   = makeAddr("bob");

    uint256 constant MINT_PRICE     = 2_000_000; // $2 USDC
    uint256 constant AUCTION_RESERVE = 100;
    // Public mint starts at #101 after ownerMint fills #1–#100
    uint256 constant FIRST_PUBLIC_ID = AUCTION_RESERVE + 1;

    function setUp() public {
        usdc   = new MockUSDC();
        basedID = new BasedID(address(usdc), owner);

        // Fund test wallets
        usdc.mint(alice, 100_000_000); // $100
        usdc.mint(bob,   100_000_000); // $100

        // Simulate proper deployment sequence:
        // 1. Owner mints auction reserve (#1–#100) for free
        // 2. Owner opens public minting
        vm.startPrank(owner);
        basedID.ownerMint(owner);
        basedID.setPaused(false);
        vm.stopPrank();
    }

    // ─── Deployment & initial state ──────────────────────────────────────────

    function test_DeploymentState() public view {
        assertEq(basedID.name(),             "Based ID");
        assertEq(basedID.symbol(),           "BASEDID");
        assertEq(basedID.MINT_PRICE(),       MINT_PRICE);
        assertEq(address(basedID.usdc()),    address(usdc));
        assertEq(basedID.owner(),            owner);
        // After ownerMint: 100 tokens minted, next public ID is 101
        assertEq(basedID.totalMinted(),      AUCTION_RESERVE);
        assertEq(basedID.nextTokenId(),      FIRST_PUBLIC_ID);
        assertEq(basedID.reserveMinted(),    true);
        assertEq(basedID.mintingPaused(),    false);
    }

    function test_RevertDeployWithZeroUSDC() public {
        vm.expectRevert("Invalid USDC address");
        new BasedID(address(0), owner);
    }

    function test_DeployStartsPaused() public {
        // Fresh deploy — must be paused before ownerMint
        BasedID fresh = new BasedID(address(usdc), owner);
        assertEq(fresh.mintingPaused(), true);
        assertEq(fresh.reserveMinted(), false);
    }

    // ─── ownerMint ───────────────────────────────────────────────────────────

    function test_OwnerMintFillsReserve() public view {
        // #1–#100 owned by owner (our auction wallet)
        for (uint256 i = 1; i <= AUCTION_RESERVE; i++) {
            assertEq(basedID.ownerOf(i), owner);
        }
        assertEq(basedID.balanceOf(owner), AUCTION_RESERVE);
    }

    function test_OwnerMintEmitsReserveMinted() public {
        BasedID fresh = new BasedID(address(usdc), owner);
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit BasedID.ReserveMinted(alice, AUCTION_RESERVE);
        fresh.ownerMint(alice);
    }

    function test_RevertOwnerMintTwice() public {
        // Already called in setUp — second call must revert
        vm.prank(owner);
        vm.expectRevert("Reserve already minted");
        basedID.ownerMint(owner);
    }

    function test_RevertOwnerMintFromNonOwner() public {
        BasedID fresh = new BasedID(address(usdc), owner);
        vm.prank(alice);
        vm.expectRevert();
        fresh.ownerMint(alice);
    }

    function test_RevertOwnerMintToZeroAddress() public {
        BasedID fresh = new BasedID(address(usdc), owner);
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        fresh.ownerMint(address(0));
    }

    function test_OwnerMintNoUSDCRequired() public {
        // ownerMint should not touch USDC at all
        BasedID fresh = new BasedID(address(usdc), owner);
        uint256 ownerUsdcBefore = usdc.balanceOf(owner);
        vm.prank(owner);
        fresh.ownerMint(owner);
        assertEq(usdc.balanceOf(owner), ownerUsdcBefore); // unchanged
    }

    // ─── isAuctionId ─────────────────────────────────────────────────────────

    function test_IsAuctionId() public view {
        assertTrue(basedID.isAuctionId(1));
        assertTrue(basedID.isAuctionId(50));
        assertTrue(basedID.isAuctionId(100));
        assertFalse(basedID.isAuctionId(101));
        assertFalse(basedID.isAuctionId(1000));
    }

    // ─── idWeight ────────────────────────────────────────────────────────────

    function test_IdWeight_DecreasesWithHigherIds() public view {
        uint256 w1   = basedID.idWeight(1);
        uint256 w4   = basedID.idWeight(4);
        uint256 w100 = basedID.idWeight(100);

        assertEq(w1, 1e18);                   // #1 → 1.0 (max)
        assertEq(w4, 5e17);                   // #4 → 0.5 (1/sqrt(4))
        assertEq(w100, 1e17);                 // #100 → 0.1 (1/sqrt(100))
        assertTrue(w1 > w4);
        assertTrue(w4 > w100);
    }

    function test_IdWeight_RevertForZero() public {
        vm.expectRevert("Invalid token ID");
        basedID.idWeight(0);
    }

    // ─── Public minting ──────────────────────────────────────────────────────

    function test_MintSuccess() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        uint256 tokenId = basedID.mint();
        vm.stopPrank();

        assertEq(tokenId,                    FIRST_PUBLIC_ID);
        assertEq(basedID.ownerOf(tokenId),   alice);
        assertEq(basedID.totalMinted(),      AUCTION_RESERVE + 1);
        assertEq(basedID.nextTokenId(),      FIRST_PUBLIC_ID + 1);
        assertEq(usdc.balanceOf(address(basedID)), MINT_PRICE);
    }

    function test_MintSequentialIds() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE * 3);
        uint256 id1 = basedID.mint();
        uint256 id2 = basedID.mint();
        uint256 id3 = basedID.mint();
        vm.stopPrank();

        assertEq(id1, FIRST_PUBLIC_ID);
        assertEq(id2, FIRST_PUBLIC_ID + 1);
        assertEq(id3, FIRST_PUBLIC_ID + 2);
        assertEq(basedID.totalMinted(), AUCTION_RESERVE + 3);
    }

    function test_MintMultipleWallets() public {
        vm.prank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        vm.prank(alice);
        basedID.mint();

        vm.prank(bob);
        usdc.approve(address(basedID), MINT_PRICE);
        vm.prank(bob);
        basedID.mint();

        assertEq(basedID.ownerOf(FIRST_PUBLIC_ID),     alice);
        assertEq(basedID.ownerOf(FIRST_PUBLIC_ID + 1), bob);
    }

    function test_MintEmitsEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        vm.expectEmit(true, true, false, false);
        emit BasedID.Minted(alice, FIRST_PUBLIC_ID);
        basedID.mint();
        vm.stopPrank();
    }

    function test_RevertMintWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert();
        basedID.mint();
    }

    function test_RevertMintWithInsufficientBalance() public {
        address broke = makeAddr("broke");
        vm.startPrank(broke);
        usdc.approve(address(basedID), MINT_PRICE);
        vm.expectRevert();
        basedID.mint();
        vm.stopPrank();
    }

    function test_MintDeductsUSDCFromCaller() public {
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        basedID.mint();
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), balanceBefore - MINT_PRICE);
    }

    function test_RevertMintWhenPaused() public {
        vm.prank(owner);
        basedID.setPaused(true);

        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        vm.expectRevert("Minting is paused");
        basedID.mint();
        vm.stopPrank();
    }

    // ─── Withdraw ────────────────────────────────────────────────────────────

    function test_WithdrawSuccess() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        basedID.mint();
        vm.stopPrank();

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        vm.prank(owner);
        basedID.withdraw();

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + MINT_PRICE);
        assertEq(usdc.balanceOf(address(basedID)), 0);
    }

    function test_WithdrawEmitsEvent() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        basedID.mint();
        vm.stopPrank();

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit BasedID.Withdrawn(owner, MINT_PRICE);
        basedID.withdraw();
    }

    function test_WithdrawAllAccumulatedFunds() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE * 5);
        for (uint256 i = 0; i < 5; i++) basedID.mint();
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(basedID)), MINT_PRICE * 5);

        vm.prank(owner);
        basedID.withdraw();
        assertEq(usdc.balanceOf(address(basedID)), 0);
    }

    function test_RevertWithdrawWhenEmpty() public {
        vm.prank(owner);
        vm.expectRevert("Nothing to withdraw");
        basedID.withdraw();
    }

    function test_RevertWithdrawFromNonOwner() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        basedID.mint();
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert();
        basedID.withdraw();
    }

    // ─── Token URI (on-chain SVG) ─────────────────────────────────────────────

    function test_TokenURIReturnsDataURI() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        uint256 id = basedID.mint();
        vm.stopPrank();

        string memory uri = basedID.tokenURI(id);
        assertTrue(_startsWith(uri, "data:application/json;base64,"), "not a data URI");
    }

    function test_TokenURIAuctionIdIsDataURI() public view {
        // Auction ID #1 was minted in setUp via ownerMint
        string memory uri = basedID.tokenURI(1);
        assertTrue(_startsWith(uri, "data:application/json;base64,"), "auction token URI broken");
    }

    function test_TokenURIRevertsForNonExistentToken() public {
        vm.expectRevert();
        basedID.tokenURI(999);
    }

    function test_TokenURIChangesAfterTransfer() public {
        vm.startPrank(alice);
        usdc.approve(address(basedID), MINT_PRICE);
        uint256 id = basedID.mint();
        basedID.transferFrom(alice, bob, id);
        vm.stopPrank();

        assertTrue(_startsWith(basedID.tokenURI(id), "data:application/json;base64,"));
        assertEq(basedID.ownerOf(id), bob);
    }

    function test_TokenURIForLargeIds() public {
        // Mint enough to reach a 5-digit ID (#10000+)
        // After setUp we're at #101, need 9900 more to reach #10001
        uint256 count = 9_900;
        uint256 total = MINT_PRICE * count;
        usdc.mint(alice, total);

        vm.startPrank(alice);
        usdc.approve(address(basedID), total);
        for (uint256 i = 0; i < count; i++) basedID.mint();
        vm.stopPrank();

        // Last minted token is a 5-digit ID
        uint256 largeId = FIRST_PUBLIC_ID + count - 1;
        string memory uri = basedID.tokenURI(largeId);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    // ─── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_MintNTimes(uint8 n) public {
        vm.assume(n > 0 && n <= 50);

        uint256 total = uint256(n) * MINT_PRICE;
        usdc.mint(alice, total);

        vm.startPrank(alice);
        usdc.approve(address(basedID), total);
        for (uint256 i = 0; i < n; i++) basedID.mint();
        vm.stopPrank();

        assertEq(basedID.totalMinted(),  AUCTION_RESERVE + uint256(n));
        assertEq(basedID.nextTokenId(),  FIRST_PUBLIC_ID + uint256(n));
        assertEq(usdc.balanceOf(address(basedID)), total);
    }

    function testFuzz_IdWeight(uint256 tokenId) public view {
        vm.assume(tokenId >= 1 && tokenId <= 1_000_000_000);
        uint256 w = basedID.idWeight(tokenId);
        // Weight is always > 0 and <= 1e18
        assertGt(w, 0);
        assertLe(w, 1e18);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory s = bytes(str);
        bytes memory p = bytes(prefix);
        if (s.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (s[i] != p[i]) return false;
        }
        return true;
    }
}
