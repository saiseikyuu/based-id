// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MemeWar
/// @notice On-chain pump.fun-style meme competition.
///
/// Revenue streams (paid directly to owner on each action):
///   1. Submission fee: 20% sent to owner instantly, 80% added to prize pool.
///   2. Vote pool: 5% sent to owner at settle.
///
/// Payout: 1st = 70% votePool + full prizePool, 2nd = 20%, 3rd = 10%.
contract MemeWar is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;

    uint256 public constant PLATFORM_VOTE_FEE_BPS       = 500;  // 5% of vote pool
    uint256 public constant PLATFORM_SUBMISSION_FEE_BPS = 2000; // 20% of submission fee

    struct War {
        address creator;
        uint256 prizePool;     // USDC seeded by creator + 80% of all submission fees
        uint256 votePool;      // USDC from votes
        uint256 voteCost;      // USDC per vote
        uint256 submissionFee; // USDC required to submit a meme (0 = free)
        uint64  endTime;
        bool    settled;
    }

    uint256 public warCount;

    mapping(uint256 => War) public wars;
    mapping(uint256 => uint256) public warEntryCount; // warId => entries submitted
    mapping(uint256 => mapping(uint256 => uint256)) public entryVotes; // warId => entryId => votes

    event WarCreated(uint256 indexed warId, address creator, uint256 prizePool, uint256 voteCost, uint256 submissionFee, uint64 endTime);
    event EntrySubmitted(uint256 indexed warId, uint256 indexed entryId, address hunter);
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
        uint256 submissionFee,
        uint64  endTime
    ) external returns (uint256 warId) {
        require(endTime > block.timestamp, "End time in past");
        require(prizePool > 0,             "Prize pool required");
        require(voteCost > 0,              "Vote cost required");

        usdc.transferFrom(msg.sender, address(this), prizePool);

        warId = ++warCount;
        wars[warId] = War({
            creator:       msg.sender,
            prizePool:     prizePool,
            votePool:      0,
            voteCost:      voteCost,
            submissionFee: submissionFee,
            endTime:       endTime,
            settled:       false
        });

        emit WarCreated(warId, msg.sender, prizePool, voteCost, submissionFee, endTime);
    }

    /// @notice Submit a meme entry. Returns the on-chain entry ID.
    ///         If submissionFee > 0: 20% goes to platform, 80% boosts prize pool.
    function submitEntry(uint256 warId) external nonReentrant returns (uint256 entryId) {
        War storage war = wars[warId];
        require(!war.settled,                  "Already settled");
        require(block.timestamp < war.endTime, "War ended");

        if (war.submissionFee > 0) {
            uint256 platformCut  = war.submissionFee * PLATFORM_SUBMISSION_FEE_BPS / 10000;
            uint256 prizePoolCut = war.submissionFee - platformCut;
            usdc.transferFrom(msg.sender, address(this), war.submissionFee);
            usdc.transfer(owner(), platformCut); // paid directly to owner instantly
            war.prizePool += prizePoolCut;
        }

        entryId = ++warEntryCount[warId];
        emit EntrySubmitted(warId, entryId, msg.sender);
    }

    /// @notice Vote for an entry. entryId is the on-chain entry ID from submitEntry().
    function vote(
        uint256 warId,
        uint256 entryId,
        uint256 voteCount
    ) external nonReentrant {
        War storage war = wars[warId];
        require(!war.settled,                  "Already settled");
        require(block.timestamp < war.endTime, "War ended");
        require(voteCount > 0,                 "Must vote at least once");

        uint256 cost = war.voteCost * voteCount;
        usdc.transferFrom(msg.sender, address(this), cost);
        war.votePool += cost;
        entryVotes[warId][entryId] += voteCount;

        emit VoteCast(warId, entryId, msg.sender, voteCount, cost);
    }

    /// @notice Platform settles war after endTime. Pass address(0) for missing 2nd/3rd.
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
        uint256 platformFee = votePool * PLATFORM_VOTE_FEE_BPS / 10000;
        uint256 dist        = votePool - platformFee;

        uint256 firstVote  = dist * 7000 / 10000;
        uint256 secondVote = dist * 2000 / 10000;
        uint256 thirdVote  = dist - firstVote - secondVote;

        usdc.transfer(owner(), platformFee); // paid directly to owner at settle

        usdc.transfer(firstWinner, firstVote + war.prizePool);
        if (secondWinner != address(0)) usdc.transfer(secondWinner, secondVote);
        else                            usdc.transfer(firstWinner,  secondVote);
        if (thirdWinner  != address(0)) usdc.transfer(thirdWinner,  thirdVote);
        else                            usdc.transfer(firstWinner,  thirdVote);

        emit WarSettled(warId, firstEntryId, secondEntryId, thirdEntryId);
    }

    /// @notice Refund creator if war had no entries.
    function cancelWar(uint256 warId) external onlyOwner {
        War storage war = wars[warId];
        require(!war.settled,                   "Already settled");
        require(block.timestamp >= war.endTime, "War not ended yet");
        war.settled = true;
        usdc.transfer(war.creator, war.prizePool + war.votePool);
        emit WarCancelled(warId);
    }

}
