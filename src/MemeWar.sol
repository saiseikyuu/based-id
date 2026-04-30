// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MemeWar
/// @notice On-chain pump.fun-style meme competition.
///         Creator deposits a USDC prize pool. Supporters pay per vote.
///         Platform (owner) calls settleWar with top-3 winner wallets after endTime.
///         Payout: 1st = 70% votePool + full prizePool, 2nd = 20%, 3rd = 10%.
///         Platform fee: 5% of votePool taken before distribution.
contract MemeWar is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%

    struct War {
        address creator;
        uint256 prizePool;  // USDC deposited by creator (6 decimals)
        uint256 votePool;   // USDC accumulated from votes
        uint256 voteCost;   // USDC cost per single vote (e.g. 100_000 = $0.10)
        uint64  endTime;
        bool    settled;
    }

    uint256 public warCount;
    mapping(uint256 => War) public wars;
    // warId => on_chain_entry_id => total votes
    mapping(uint256 => mapping(uint256 => uint256)) public entryVotes;

    event WarCreated(uint256 indexed warId, address creator, uint256 prizePool, uint256 voteCost, uint64 endTime);
    event VoteCast(uint256 indexed warId, uint256 indexed entryId, address voter, uint256 votes, uint256 amount);
    event WarSettled(uint256 indexed warId, uint256 first, uint256 second, uint256 third);
    event WarCancelled(uint256 indexed warId);

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    /// @notice Creator starts a war by depositing a USDC prize pool.
    function createWar(
        uint256 prizePool,
        uint256 voteCost,
        uint64  endTime
    ) external returns (uint256 warId) {
        require(endTime > block.timestamp, "End time in past");
        require(prizePool > 0, "Prize pool required");
        require(voteCost > 0, "Vote cost required");

        usdc.transferFrom(msg.sender, address(this), prizePool);

        warId = ++warCount;
        wars[warId] = War({
            creator:   msg.sender,
            prizePool: prizePool,
            votePool:  0,
            voteCost:  voteCost,
            endTime:   endTime,
            settled:   false
        });

        emit WarCreated(warId, msg.sender, prizePool, voteCost, endTime);
    }

    /// @notice Vote for an entry. entryId is the sequential on_chain_id from the DB.
    function vote(
        uint256 warId,
        uint256 entryId,
        uint256 voteCount
    ) external nonReentrant {
        War storage war = wars[warId];
        require(!war.settled,                    "Already settled");
        require(block.timestamp < war.endTime,   "War ended");
        require(voteCount > 0,                   "Must vote at least once");

        uint256 cost = war.voteCost * voteCount;
        usdc.transferFrom(msg.sender, address(this), cost);
        war.votePool += cost;
        entryVotes[warId][entryId] += voteCount;

        emit VoteCast(warId, entryId, msg.sender, voteCount, cost);
    }

    /// @notice Platform settles the war after endTime, distributing prizes.
    ///         Pass address(0) for missing 2nd/3rd if fewer than 3 entries.
    function settleWar(
        uint256 warId,
        uint256 firstEntryId,
        uint256 secondEntryId,
        uint256 thirdEntryId,
        address firstWinner,
        address secondWinner,
        address thirdWinner
    ) external onlyOwner nonReentrant {
        War storage war = wars[warId];
        require(!war.settled,                   "Already settled");
        require(block.timestamp >= war.endTime, "War not ended yet");
        require(firstWinner != address(0),      "First winner required");

        war.settled = true;

        uint256 votePool    = war.votePool;
        uint256 platformFee = votePool * PLATFORM_FEE_BPS / 10000;
        uint256 dist        = votePool - platformFee;

        uint256 firstVote  = dist * 7000 / 10000;
        uint256 secondVote = dist * 2000 / 10000;
        uint256 thirdVote  = dist - firstVote - secondVote;

        if (platformFee > 0)            usdc.transfer(owner(), platformFee);
        usdc.transfer(firstWinner,      firstVote + war.prizePool);
        if (secondWinner != address(0)) usdc.transfer(secondWinner, secondVote);
        else                            usdc.transfer(firstWinner, secondVote);
        if (thirdWinner  != address(0)) usdc.transfer(thirdWinner, thirdVote);
        else                            usdc.transfer(firstWinner, thirdVote);

        emit WarSettled(warId, firstEntryId, secondEntryId, thirdEntryId);
    }

    /// @notice Refund creator if war had no entries. Only callable by owner after endTime.
    function cancelWar(uint256 warId) external onlyOwner {
        War storage war = wars[warId];
        require(!war.settled,                   "Already settled");
        require(block.timestamp >= war.endTime, "War not ended yet");
        war.settled = true;
        usdc.transfer(war.creator, war.prizePool + war.votePool);
        emit WarCancelled(warId);
    }
}
