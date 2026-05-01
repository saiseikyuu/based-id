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

    uint256 constant PRIZE = 100_000_000; // $100 USDC
    uint256 constant VCOST =     100_000; // $0.10 per vote

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
        warId = memeWar.createWar(PRIZE, VCOST, endTime);
    }

    function testCreateWar() public {
        (uint256 warId, uint64 endTime) = _createWar();
        assertEq(warId, 1);
        (address c, uint256 pp,, uint256 vc, uint64 et, bool s) = memeWar.wars(1);
        assertEq(c, creator);
        assertEq(pp, PRIZE);
        assertEq(vc, VCOST);
        assertEq(et, endTime);
        assertFalse(s);
        assertEq(usdc.balanceOf(address(memeWar)), PRIZE);
    }

    function testVote() public {
        (uint256 warId,) = _createWar();
        vm.prank(alice);
        memeWar.vote(warId, 1, 5);
        assertEq(memeWar.entryVotes(warId, 1), 5);
        assertEq(usdc.balanceOf(address(memeWar)), PRIZE + VCOST * 5);
    }

    function testSettleWar() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.prank(alice); memeWar.vote(warId, 1, 10); // $1.00
        vm.prank(bob);   memeWar.vote(warId, 2,  5); // $0.50
        // votePool = 1_500_000
        // fee 5%   = 75_000
        // dist     = 1_425_000
        // firstVote  = 997_500 (70%)
        // secondVote = 285_000 (20%)
        // thirdVote  = 142_500 (10%) — no 3rd, overflows to first

        vm.warp(endTime + 1);

        uint256 ownerBefore = usdc.balanceOf(owner);
        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);

        vm.prank(owner);
        memeWar.settleWar(warId, 1, 2, 0, alice, bob, address(0));

        uint256 vp   = 1_500_000;
        uint256 fee  = vp * 500 / 10000;
        uint256 dist = vp - fee;
        uint256 fv   = dist * 7000 / 10000;
        uint256 sv   = dist * 2000 / 10000;
        uint256 tv   = dist - fv - sv; // goes to alice (no 3rd)

        assertEq(usdc.balanceOf(owner) - ownerBefore, fee);
        assertEq(usdc.balanceOf(alice) - aliceBefore, fv + PRIZE + tv);
        assertEq(usdc.balanceOf(bob)   - bobBefore,   sv);

        (,,,,, bool settled) = memeWar.wars(warId);
        assertTrue(settled);
    }

    function testCannotVoteAfterEnd() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.warp(endTime + 1);
        vm.prank(alice);
        vm.expectRevert("War ended");
        memeWar.vote(warId, 1, 1);
    }

    function testCannotSettleBeforeEnd() public {
        (uint256 warId,) = _createWar();
        vm.prank(owner);
        vm.expectRevert("War not ended yet");
        memeWar.settleWar(warId, 1, 2, 3, alice, bob, alice);
    }

    function testCannotDoubleSettle() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.prank(alice); memeWar.vote(warId, 1, 1);
        vm.warp(endTime + 1);
        vm.prank(owner); memeWar.settleWar(warId, 1, 0, 0, alice, address(0), address(0));
        vm.prank(owner);
        vm.expectRevert("Already settled");
        memeWar.settleWar(warId, 1, 0, 0, alice, address(0), address(0));
    }

    function testCancelWar() public {
        (uint256 warId, uint64 endTime) = _createWar();
        uint256 creatorBefore = usdc.balanceOf(creator);
        vm.warp(endTime + 1);
        vm.prank(owner);
        memeWar.cancelWar(warId);
        assertEq(usdc.balanceOf(creator) - creatorBefore, PRIZE);
    }

    function testOnlyOwnerCanSettle() public {
        (uint256 warId, uint64 endTime) = _createWar();
        vm.warp(endTime + 1);
        vm.prank(alice);
        vm.expectRevert();
        memeWar.settleWar(warId, 1, 0, 0, alice, address(0), address(0));
    }

    function testRevertOnEndTimeInPast() public {
        vm.prank(creator);
        vm.expectRevert("End time in past");
        memeWar.createWar(PRIZE, VCOST, uint64(block.timestamp - 1));
    }

    function testRevertOnZeroPrize() public {
        vm.prank(creator);
        vm.expectRevert("Prize pool required");
        memeWar.createWar(0, VCOST, uint64(block.timestamp + 1 days));
    }
}
