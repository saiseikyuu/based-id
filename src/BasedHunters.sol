// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IBasedID {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title BasedHunters
/// @notice Soulbound ERC721. One per wallet. Rank updates via server-signed oracle messages.
///         Holders must own a Based ID to claim.
contract BasedHunters is ERC721, Ownable {
    using ECDSA for bytes32;
    using Strings for uint256;

    enum Rank { E, D, C, B, A, S, National }

    IBasedID public immutable basedID;
    address  public rankOracle;

    uint256 private _nextId = 1;

    mapping(address  => uint256) public tokenOf;  // wallet → tokenId (0 = unclaimed)
    mapping(uint256  => Rank)    public rankOf;   // tokenId → current rank
    mapping(address  => uint256) public nonces;   // wallet → highest consumed nonce

    // ── Events ────────────────────────────────────────────────────────────────
    event Claimed(address indexed wallet, uint256 indexed tokenId);
    event RankUpdated(address indexed wallet, uint256 indexed tokenId, Rank newRank);
    event OracleUpdated(address newOracle);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyClaimed();
    error NoBasedID();
    error NoHunter();
    error StaleNonce();
    error InvalidSignature();
    error SoulboundToken();

    constructor(
        address _basedID,
        address _oracle,
        address _owner
    ) ERC721("Based Hunters", "HUNTER") Ownable(_owner) {
        basedID    = IBasedID(_basedID);
        rankOracle = _oracle;
    }

    // ── Claiming ──────────────────────────────────────────────────────────────

    /// @notice Claim a Hunter NFT. Caller must hold at least one Based ID. Free (gas only).
    function claim() external {
        if (tokenOf[msg.sender] != 0)              revert AlreadyClaimed();
        if (basedID.balanceOf(msg.sender) == 0)    revert NoBasedID();

        uint256 id = _nextId++;
        tokenOf[msg.sender] = id;
        rankOf[id]          = Rank.E;
        _safeMint(msg.sender, id);
        emit Claimed(msg.sender, id);
    }

    // ── Rank Oracle ───────────────────────────────────────────────────────────

    /// @notice Update a wallet's Hunter rank. Caller submits a server-signed message.
    ///         Signature covers: chainId, contract address, wallet, newRank, nonce.
    function updateRank(
        address  wallet,
        Rank     newRank,
        uint256  nonce,
        bytes calldata sig
    ) external {
        uint256 tokenId = tokenOf[wallet];
        if (tokenId == 0)       revert NoHunter();
        if (nonce <= nonces[wallet]) revert StaleNonce();

        bytes32 hash    = keccak256(abi.encodePacked(block.chainid, address(this), wallet, uint8(newRank), nonce));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        if (ECDSA.recover(ethHash, sig) != rankOracle) revert InvalidSignature();

        nonces[wallet]   = nonce;
        rankOf[tokenId]  = newRank;
        emit RankUpdated(wallet, tokenId, newRank);
    }

    /// @notice Owner can rotate the rank oracle key.
    function setOracle(address _oracle) external onlyOwner {
        rankOracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    // ── Soulbound ─────────────────────────────────────────────────────────────

    /// @dev Block all transfers except minting (from == address(0)).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundToken();
        return super._update(to, tokenId, auth);
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Rank   rank    = rankOf[tokenId];
        string memory letter = _rankLetter(rank);
        string memory name   = _rankName(rank);
        string memory color  = _rankColor(rank);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs>',
            '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0%" stop-color="#0a0a0a"/>',
            '<stop offset="100%" stop-color="#131313"/>',
            '</linearGradient>',
            '<filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/>',
            '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '</defs>',
            '<rect width="400" height="400" fill="url(#bg)" rx="24"/>',
            '<rect x="1" y="1" width="398" height="398" fill="none" rx="23" stroke="', color, '" stroke-width="1.5" stroke-opacity="0.35"/>',
            '<text x="200" y="210" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="160" font-weight="900" fill="', color, '" filter="url(#glow)" opacity="0.15">', letter, '</text>',
            '<text x="200" y="210" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="160" font-weight="900" fill="', color, '">', letter, '</text>',
            '<text x="200" y="302" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="#ffffff" opacity="0.85">', name, '</text>',
            '<text x="200" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#444444" letter-spacing="3">BASED HUNTERS  #', tokenId.toString(), '</text>',
            '</svg>'
        ));

        string memory attrs = string(abi.encodePacked(
            '[{"trait_type":"Rank","value":"', name, '"},',
            '{"trait_type":"Rank Letter","value":"', letter, '"},',
            '{"display_type":"number","trait_type":"Rank Level","value":', uint256(rank).toString(), '}]'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"Based Hunter #', tokenId.toString(), '",',
            '"description":"Soulbound identity for Based ID hunters. Rank rises as you explore the Base ecosystem.",',
            '"attributes":', attrs, ',',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function contractURI() external pure returns (string memory) {
        return "https://basedid.space/api/hunters/contract";
    }

    function totalSupply() external view returns (uint256) {
        return _nextId - 1;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _rankName(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "National Hunter";
        if (r == Rank.S)        return "S-Rank Hunter";
        if (r == Rank.A)        return "A-Rank Hunter";
        if (r == Rank.B)        return "B-Rank Hunter";
        if (r == Rank.C)        return "C-Rank Hunter";
        if (r == Rank.D)        return "D-Rank Hunter";
        return "E-Rank Hunter";
    }

    function _rankLetter(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "N";
        if (r == Rank.S)        return "S";
        if (r == Rank.A)        return "A";
        if (r == Rank.B)        return "B";
        if (r == Rank.C)        return "C";
        if (r == Rank.D)        return "D";
        return "E";
    }

    function _rankColor(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "#fbbf24"; // amber / gold
        if (r == Rank.S)        return "#f97316"; // orange
        if (r == Rank.A)        return "#a855f7"; // purple
        if (r == Rank.B)        return "#3b82f6"; // blue
        if (r == Rank.C)        return "#22c55e"; // green
        if (r == Rank.D)        return "#84cc16"; // lime
        return "#71717a";                          // zinc  (E)
    }
}
