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
/// @notice Soulbound ERC721 Hunter License. One per wallet. Rank updates via oracle signature.
contract BasedHunters is ERC721, Ownable {
    using ECDSA for bytes32;
    using Strings for uint256;

    enum Rank { E, D, C, B, A, S, National }

    IBasedID public immutable basedID;
    address  public rankOracle;

    uint256 private _nextId = 1;

    mapping(address => uint256) public tokenOf;
    mapping(uint256 => Rank)    public rankOf;
    mapping(address => uint256) public nonces;

    event Claimed(address indexed wallet, uint256 indexed tokenId);
    event RankUpdated(address indexed wallet, uint256 indexed tokenId, Rank newRank);
    event OracleUpdated(address newOracle);

    error AlreadyClaimed();
    error NoBasedID();
    error NoHunter();
    error StaleNonce();
    error InvalidSignature();
    error SoulboundToken();

    constructor(address _basedID, address _oracle, address _owner)
        ERC721("Based Hunters", "HUNTER") Ownable(_owner)
    {
        basedID    = IBasedID(_basedID);
        rankOracle = _oracle;
    }

    // ── Claiming ──────────────────────────────────────────────────────────────

    function claim() external {
        if (tokenOf[msg.sender] != 0)           revert AlreadyClaimed();
        if (basedID.balanceOf(msg.sender) == 0) revert NoBasedID();
        uint256 id = _nextId++;
        tokenOf[msg.sender] = id;
        rankOf[id] = Rank.E;
        _safeMint(msg.sender, id);
        emit Claimed(msg.sender, id);
    }

    // ── Rank Oracle ───────────────────────────────────────────────────────────

    function updateRank(address wallet, Rank newRank, uint256 nonce, bytes calldata sig) external {
        uint256 tokenId = tokenOf[wallet];
        if (tokenId == 0)            revert NoHunter();
        if (nonce <= nonces[wallet]) revert StaleNonce();
        bytes32 hash    = keccak256(abi.encodePacked(block.chainid, address(this), wallet, uint8(newRank), nonce));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        if (ECDSA.recover(ethHash, sig) != rankOracle) revert InvalidSignature();
        nonces[wallet]  = nonce;
        rankOf[tokenId] = newRank;
        emit RankUpdated(wallet, tokenId, newRank);
    }

    function setOracle(address _oracle) external onlyOwner {
        rankOracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    // ── Soulbound ─────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundToken();
        return super._update(to, tokenId, auth);
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Rank r = rankOf[tokenId];
        string memory color  = _rankColor(r);
        string memory letter = _rankLetter(r);
        string memory rName  = _rankName(r);
        string memory rClass = _rankClass(r);
        string memory lic    = string(abi.encodePacked("HA-2026-", _padId(tokenId)));

        bytes memory svg  = _buildSVG(color, letter, rName, rClass, _rankDark1(r), _rankDark2(r), lic);
        bytes memory json = abi.encodePacked(
            '{"name":"Based Hunter #', tokenId.toString(), '",',
            '"description":"Official Based ID Hunter License. Soulbound rank that grows as you explore Base.",',
            '"attributes":[',
              '{"trait_type":"Rank","value":"', rName, '"},',
              '{"trait_type":"Class","value":"', rClass, '"},',
              '{"display_type":"number","trait_type":"Rank Level","value":', uint256(r).toString(), '}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(svg), '"}'
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function contractURI() external pure returns (string memory) {
        return "https://basedid.space/api/hunters/contract";
    }

    function totalSupply() external view returns (uint256) { return _nextId - 1; }

    // ── SVG Builder ───────────────────────────────────────────────────────────

    function _buildSVG(
        string memory color,
        string memory letter,
        string memory rName,
        string memory rClass,
        string memory d1,
        string memory d2,
        string memory lic
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(
            _svgDefs(color, d1, d2),
            _svgHeader(color),
            _svgNameStrip(color, lic),
            _svgRankBadge(color, letter, rClass),
            _svgBottom(color, rName, lic),
            _svgFooter(color)
        );
    }

    function _svgDefs(string memory color, string memory d1, string memory d2) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330">',
            '<defs>',
            '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
              '<stop offset="0%" stop-color="', d1, '"/>',
              '<stop offset="100%" stop-color="', d2, '"/>',
            '</linearGradient>',
            '<linearGradient id="hd" x1="0" y1="0" x2="0" y2="1">',
              '<stop offset="0%" stop-color="#090c15"/>',
              '<stop offset="100%" stop-color="#05070d"/>',
            '</linearGradient>',
            '<radialGradient id="rb" cx="50%" cy="30%" r="75%">',
              '<stop offset="0%" stop-color="', color, '" stop-opacity="0.32"/>',
              '<stop offset="100%" stop-color="', color, '" stop-opacity="0.05"/>',
            '</radialGradient>',
            '<linearGradient id="bt" x1="0" y1="0" x2="0" y2="1">',
              '<stop offset="0%" stop-color="#04060d"/>',
              '<stop offset="100%" stop-color="#020409"/>',
            '</linearGradient>',
            '<filter id="gf"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '<clipPath id="cl"><rect width="520" height="330" rx="13"/></clipPath>',
            '</defs>',
            '<rect width="520" height="330" fill="url(#bg)" rx="13"/>',
            _svgDiagLines(color)
        );
    }

    function _svgDiagLines(string memory c) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<g clip-path="url(#cl)" opacity="1">',
            '<line x1="-126" y1="0" x2="204" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="-84" y1="0" x2="246" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="-42" y1="0" x2="288" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="0" y1="0" x2="330" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="42" y1="0" x2="372" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="84" y1="0" x2="414" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="126" y1="0" x2="456" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="168" y1="0" x2="498" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '<line x1="210" y1="0" x2="540" y2="330" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.05"/>',
            '</g>'
        );
    }

    function _svgHeader(string memory c) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="0" y="0" width="520" height="52" fill="url(#hd)"/>',
            '<rect x="0" y="0" width="520" height="2.5" fill="', c, '" fill-opacity="0.9"/>',
            '<rect x="0" y="51" width="520" height="1" fill="', c, '" fill-opacity="0.15"/>',
            '<text x="28" y="21" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#fff" opacity="0.95">Official Hunter\'s License</text>',
            '<text x="28" y="39" font-family="system-ui,sans-serif" font-size="9.5" fill="', c, '" opacity="0.75" letter-spacing="1.5">HUNTER LICENSE  &gt;&gt;&gt;</text>'
        );
    }

    function _svgNameStrip(string memory c, string memory lic) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<polygon points="18,68 432,68 420,106 18,106" fill="', c, '" fill-opacity="0.9"/>',
            '<polygon points="18,68 432,68 420,106 18,106" fill="#000" fill-opacity="0.15"/>',
            '<text x="28" y="93" font-family="system-ui,sans-serif" font-size="22" font-weight="900" fill="#fff">BASED HUNTERS</text>',
            '<text x="28" y="125" font-family="system-ui,sans-serif" font-size="9.5" letter-spacing="5" fill="', c, '" opacity="0.65">BASED  ID</text>',
            '<line x1="18" y1="138" x2="390" y2="138" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.2"/>',
            '<line x1="18" y1="143" x2="200" y2="143" stroke="', c, '" stroke-width="0.4" stroke-opacity="0.12"/>',
            '<path d="M20 66 L20 55 L32 55" fill="none" stroke="', c, '" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0.6"/>',
            '<text x="28" y="190" font-family="monospace,system-ui" font-size="9" letter-spacing="2" fill="', c, '" opacity="0.12">', lic, '</text>'
        );
    }

    function _svgRankBadge(string memory c, string memory letter, string memory rClass) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="400" y="52" width="120" height="158" fill="url(#rb)"/>',
            '<rect x="400" y="52" width="1.5" height="158" fill="', c, '" fill-opacity="0.45"/>',
            '<text x="413" y="142" font-family="system-ui,sans-serif" font-size="22" font-weight="900" fill="', c, '" opacity="0.5">&#9668;&#9668;</text>',
            '<text x="460" y="138" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="68" font-weight="900" fill="', c, '" filter="url(#gf)">', letter, '</text>',
            '<rect x="418" y="163" width="84" height="22" rx="3" fill="', c, '" fill-opacity="0.2" stroke="', c, '" stroke-width="0.8" stroke-opacity="0.6"/>',
            '<text x="460" y="178" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" letter-spacing="3" fill="#fff">RANK</text>',
            '<text x="460" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="', c, '" opacity="0.85" font-weight="700">', rClass, '</text>'
        );
    }

    function _svgBottom(string memory c, string memory rName, string memory lic) internal pure returns (bytes memory) {
        bytes memory info = abi.encodePacked(
            '<rect x="0" y="210" width="520" height="120" fill="url(#bt)"/>',
            '<rect x="0" y="210" width="520" height="1" fill="', c, '" fill-opacity="0.18"/>',
            '<text x="300" y="285" text-anchor="middle" font-family="system-ui,sans-serif" font-size="68" font-weight="900" fill="', c, '" opacity="0.04" transform="rotate(-8,300,285)">HUNTERS</text>',
            '<text x="76" y="228" font-family="system-ui,sans-serif" font-size="8" fill="#475569">Class</text>',
            '<text x="115" y="228" font-family="system-ui,sans-serif" font-size="8.5" fill="', c, '" font-weight="700">', rName, '</text>',
            '<text x="76" y="245" font-family="system-ui,sans-serif" font-size="8" fill="#475569">License</text>',
            '<text x="115" y="245" font-family="monospace,system-ui" font-size="8.5" fill="#cbd5e1">', lic, '</text>',
            '<line x1="70" y1="252" x2="390" y2="252" stroke="#fff" stroke-width="0.3" stroke-opacity="0.1"/>',
            '<text x="76" y="265" font-family="system-ui,sans-serif" font-size="8" fill="#475569">Affiliation</text>',
            '<text x="120" y="265" font-family="system-ui,sans-serif" font-size="8.5" fill="#94a3b8">N/A</text>',
            '<text x="76" y="280" font-family="system-ui,sans-serif" font-size="8" fill="#475569">Issued by</text>',
            '<text x="120" y="280" font-family="system-ui,sans-serif" font-size="8.5" fill="#94a3b8">Based ID Hunters Association</text>'
        );

        bytes memory chip = abi.encodePacked(
            '<rect x="18" y="218" width="42" height="32" rx="4" fill="#c9a227" fill-opacity="0.85"/>',
            '<rect x="18" y="218" width="42" height="32" rx="4" fill="none" stroke="#a07a10" stroke-width="0.5"/>',
            '<line x1="18" y1="228" x2="60" y2="228" stroke="#a07a10" stroke-width="0.5"/>',
            '<line x1="18" y1="238" x2="60" y2="238" stroke="#a07a10" stroke-width="0.5"/>',
            '<line x1="32" y1="218" x2="32" y2="250" stroke="#a07a10" stroke-width="0.5"/>',
            '<line x1="46" y1="218" x2="46" y2="250" stroke="#a07a10" stroke-width="0.5"/>',
            '<rect x="20" y="220" width="10" height="10" rx="1" fill="#b8860b" fill-opacity="0.6"/>',
            '<rect x="34" y="220" width="10" height="10" rx="1" fill="#b8860b" fill-opacity="0.6"/>',
            '<rect x="48" y="220" width="10" height="10" rx="1" fill="#b8860b" fill-opacity="0.6"/>',
            '<rect x="20" y="240" width="10" height="8" rx="1" fill="#b8860b" fill-opacity="0.5"/>',
            '<rect x="34" y="240" width="10" height="8" rx="1" fill="#b8860b" fill-opacity="0.5"/>',
            '<rect x="48" y="240" width="10" height="8" rx="1" fill="#b8860b" fill-opacity="0.5"/>'
        );

        bytes memory bcode = abi.encodePacked(
            _svgBarcode(c),
            '<text x="303" y="300" text-anchor="middle" font-family="monospace,system-ui" font-size="7.5" letter-spacing="2" fill="', c, '" opacity="0.4">', lic, '</text>'
        );

        return abi.encodePacked(info, chip, bcode);
    }

    function _svgBarcode(string memory c) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="145" y="248" width="3" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="150" y="248" width="2" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="154" y="248" width="3" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="161" y="248" width="1" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="165" y="248" width="1" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="170" y="248" width="1" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="174" y="248" width="3" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="179" y="248" width="1" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="184" y="248" width="3" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="189" y="248" width="2" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="193" y="248" width="2" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="198" y="248" width="3" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="203" y="248" width="2" height="44" fill="', c, '" opacity="0.65"/>',
            '<rect x="208" y="248" width="1" height="44" fill="', c, '" opacity="0.65"/>'
        );
    }

    function _svgFooter(string memory c) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="0" y="316" width="520" height="14" fill="#000" fill-opacity="0.45"/>',
            '<rect x="0" y="327.5" width="520" height="2.5" fill="', c, '" fill-opacity="0.4"/>',
            '<text x="260" y="324" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6.5" letter-spacing="2" fill="', c, '" opacity="0.25">BASEDID.SPACE  &#183;  OFFICIAL HUNTER LICENSE</text>',
            '<rect x="0.5" y="0.5" width="519" height="329" rx="12.5" fill="none" stroke="', c, '" stroke-width="0.8" stroke-opacity="0.4"/>',
            '</svg>'
        );
    }

    // ── Rank data helpers ─────────────────────────────────────────────────────

    function _rankColor(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "#fcd34d";
        if (r == Rank.S)        return "#f97316";
        if (r == Rank.A)        return "#c084fc";
        if (r == Rank.B)        return "#60a5fa";
        if (r == Rank.C)        return "#34d399";
        if (r == Rank.D)        return "#a3e635";
        return "#94a3b8";
    }

    function _rankDark1(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "#1a1404";
        if (r == Rank.S)        return "#1e0d04";
        if (r == Rank.A)        return "#160826";
        if (r == Rank.B)        return "#071528";
        if (r == Rank.C)        return "#071a13";
        if (r == Rank.D)        return "#141d09";
        return "#1a1c26";
    }

    function _rankDark2(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "#110e02";
        if (r == Rank.S)        return "#120802";
        if (r == Rank.A)        return "#0e0519";
        if (r == Rank.B)        return "#040e1b";
        if (r == Rank.C)        return "#04100c";
        if (r == Rank.D)        return "#0a1206";
        return "#0d0f18";
    }

    function _rankName(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "National Hunter";
        if (r == Rank.S)        return "S-Rank Hunter";
        if (r == Rank.A)        return "A-Rank Hunter";
        if (r == Rank.B)        return "B-Rank Hunter";
        if (r == Rank.C)        return "C-Rank Hunter";
        if (r == Rank.D)        return "D-Rank Hunter";
        return "E-Rank Hunter";
    }

    function _rankClass(Rank r) internal pure returns (string memory) {
        if (r == Rank.National) return "NATIONAL";
        if (r == Rank.S)        return "S-CLASS";
        if (r == Rank.A)        return "A-CLASS";
        if (r == Rank.B)        return "B-CLASS";
        if (r == Rank.C)        return "C-CLASS";
        if (r == Rank.D)        return "D-CLASS";
        return "E-CLASS";
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

    function _padId(uint256 id) internal pure returns (string memory) {
        if (id < 10)   return string(abi.encodePacked("000", id.toString()));
        if (id < 100)  return string(abi.encodePacked("00",  id.toString()));
        if (id < 1000) return string(abi.encodePacked("0",   id.toString()));
        return id.toString();
    }
}
