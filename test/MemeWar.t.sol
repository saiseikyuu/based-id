// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MemeWar.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MemeWarTest is Test {
    MemeWar  public memeWar;
    MockUSDC public usdc;

    address owner   = makeAddr("owner");
    address creator = makeAddr("creator");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");

    uint256 constant PRIZE   = 100_000_000; // $100
    uint256 constant VCOST   =     100_000; // $0.10 per vote
    uint256 constant SUBFEE  =     500_000; // $0.50 submission fee

    function setUp() public {
        usdc    = new MockUSDC();
        memeWar = new MemeWar(address(usdc), owner);

        usdc.mint(creator, 1_000_000_000);
        usdc.mint(alice,   1_000_000_000);
        usdc.mint(bob,     1_000_000_000);

        vm.prank(creator); usdc.approve(address(memeWar), type(uint256).max);
        vm.prank(alice);   usdc.approve(address(memeWar), type(uint256).max);
        vm.prank(bob);     usdc.approve(address(memeWar), type(uint256).max);
    }

    function _createWar() internal returns (uint256 warId, uint64 endTime) {
        endTime = uint64(block.timestamp + 7 days);
        vm.prank(creator);
        warId = memeWar.createWar(PRIZE, VCOST, SUBFEE, endTime);
    }

    function testCreateWar() public {
        (uint256 warId, uint64 endTime) = _createWar();
        assertEq(warId, 1);
        (address c, uint256 pp,, uint256 vc, uint256 sf, uint64 et, bool s) = memeWar.wars(1);
        assertEq(c, creator);
        assertEq(pp, PRIZE);
        assertEq(vc, VCOST);
        assertEq(sf, SUBFEE);
        assertEq(et, endTime);
        assertFalse(s);
        assertEq(usdc.balanceOf(address(memeWar)), PRIZE);
    }

    function testSubmitEntry() public {
        (uint256 warId,) = _createWar();

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 ownerBefore = usdc.balanceOf(owner);
        vm.prank(alice);
        uint256 entryId = memeWar.submitEntry(warId);

        assertEq(entryId, 1);
        assertEq(usdc.balanceOf(alice), aliceBefore - SUBFEE);

        // 20% goes directly to owner
        uint256 platformCut = SUBFEE * 2000 / 10000;
        assertEq(usdc.balanceOf(owner) - ownerBefore, platformCut);

        // 80% added to prizePool
        (,uint256 pp,,,,,) = memeWar.wars(warId);
        assertEq(pp, PRIZE + SUBFEE * 8000 / 10000);
    }

    function testFreeSubmission() public {
        // War with zero submission fee
        uint64 endTime = uint64(block.timestamp + 7 days);
        vm.prank(creator);
        uint256 warId = memeWar.createWar(PRIZE, VCOST, 0, endTime);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 entryId = memeWar.submitEntry(warId);

        assertEq(entryId, 1);
        assertEq(usdc.balanceOf(alice), aliceBefore); // no charge
    }

    function testVote() public {
        (uint256 warId,) = _createWar();
        vm.prank(alice); memeWar.submitEntry(warId);

        vm.prank(bob);
        memeWar.vote(warId, 1, 5);
        assertEq(memeWar.entryVotes(warId, 1), 5);
    }

    function testSettleWar() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.prank(alice); memeWar.submitEntry(warId); // entryId=1, fee paid
        vm.prank(bob);   memeWar.submitEntry(warId); // entryId=2, fee paid

        vm.prank(alice); memeWar.vote(warId, 1, 10); // $1.00
        vm.prank(bob);   memeWar.vote(warId, 2,  5); // $0.50

        vm.warp(endTime + 1);

        uint256 ownerBefore = usdc.balanceOf(owner);
        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);

        vm.prank(owner);
        memeWar.settleWar(warId, 1, 2, 0, alice, bob, address(0));

        // votePool = 1_500_000; vote fee 5% = 75_000 → owner; dist = 1_425_000
        // prizePool = PRIZE + 2 × 80% × SUBFEE = 100_000_000 + 800_000 = 100_800_000
        uint256 vp      = 1_500_000;
        uint256 voteFee = vp * 500 / 10000;
        uint256 dist    = vp - voteFee;
        uint256 fv      = dist * 7000 / 10000;
        uint256 sv      = dist * 2000 / 10000;
        uint256 tv      = dist - fv - sv;
        uint256 prize   = PRIZE + 2 * (SUBFEE * 8000 / 10000);

        // Sub fees were already paid to owner during submitEntry; only vote fee here
        assertEq(usdc.balanceOf(owner) - ownerBefore, voteFee);
        assertEq(usdc.balanceOf(alice) - aliceBefore, fv + prize + tv);
        assertEq(usdc.balanceOf(bob)   - bobBefore,   sv);
    }

    function testCannotSubmitAfterEnd() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.warp(endTime + 1);
        vm.prank(alice);
        vm.expectRevert("War ended");
        memeWar.submitEntry(warId);
    }

    function testCannotDoubleSettle() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.prank(alice); memeWar.submitEntry(warId);
        vm.warp(endTime + 1);
        vm.prank(owner); memeWar.settleWar(warId, 1, 0, 0, alice, address(0), address(0));
        vm.prank(owner);
        vm.expectRevert("Already settled");
        memeWar.settleWar(warId, 1, 0, 0, alice, address(0), address(0));
    }
}
