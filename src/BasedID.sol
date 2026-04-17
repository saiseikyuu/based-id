// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Based ID
/// @notice Sequential NFT identity pass on Base. Flat $2 USDC. On-chain SVG art.
///
/// Deployment sequence:
///   1. Deploy (minting starts paused automatically)
///   2. Call ownerMint(auctionWallet) — mints #1–#100 free to your wallet
///   3. Call setPaused(false) — opens public mint at #101
contract BasedID is ERC721, Ownable {
    using Strings for uint256;

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Flat public mint price — $2 USDC (6 decimals).
    uint256 public constant MINT_PRICE = 2_000_000;

    /// @notice IDs #1–AUCTION_RESERVE are minted free via ownerMint() for auction.
    uint256 public constant AUCTION_RESERVE = 100;

    // USDC on Base mainnet:  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    // USDC on Base Sepolia:  0x036CbD53842c5426634e7929541eC2318f3dCF7e
    IERC20 public immutable usdc;

    // ─── State ───────────────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    /// @notice True when public minting is paused. Starts true — owner must
    ///         call ownerMint() then setPaused(false) to open public minting.
    bool public mintingPaused;

    /// @notice True once ownerMint() has been called. Prevents a second call.
    bool public reserveMinted;

    // ─── Events ──────────────────────────────────────────────────────────────

    event Minted(address indexed to, uint256 indexed tokenId);
    event ReserveMinted(address indexed to, uint256 count);
    event Withdrawn(address indexed to, uint256 amount);
    event MintingPaused(bool paused);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address usdcAddress, address initialOwner)
        ERC721("Based ID", "BASEDID")
        Ownable(initialOwner)
    {
        require(usdcAddress != address(0), "Invalid USDC address");
        usdc = IERC20(usdcAddress);
        _nextTokenId = 1;
        mintingPaused = true; // stays paused until ownerMint() + setPaused(false)
    }

    // ─── Owner: Reserve Mint ─────────────────────────────────────────────────

    /// @notice Mints IDs #1–#100 for free to `to` (your auction wallet).
    ///         Can only be called once. No USDC required.
    ///         Call this before setPaused(false) so auction IDs are secured first.
    function ownerMint(address to) external onlyOwner {
        require(!reserveMinted, "Reserve already minted");
        require(to != address(0), "Invalid address");
        reserveMinted = true;

        for (uint256 i = 0; i < AUCTION_RESERVE; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            emit Minted(to, tokenId);
        }

        emit ReserveMinted(to, AUCTION_RESERVE);
    }

    // ─── Public Mint ─────────────────────────────────────────────────────────

    /// @notice Mint a Based ID for $2 USDC.
    ///         Caller must approve this contract to spend 2 USDC first.
    ///         Public mint starts at #101 (after ownerMint fills #1–#100).
    function mint() external returns (uint256) {
        require(!mintingPaused, "Minting is paused");
        // Assign ID before external call (CEI pattern)
        uint256 tokenId = _nextTokenId++;
        require(
            usdc.transferFrom(msg.sender, address(this), MINT_PRICE),
            "USDC transfer failed"
        );
        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
        return tokenId;
    }

    // ─── Owner Controls ──────────────────────────────────────────────────────

    /// @notice Pause or unpause public minting.
    function setPaused(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }

    /// @notice Withdraw all USDC (public mint revenue) to owner's wallet.
    function withdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "Nothing to withdraw");
        require(usdc.transfer(owner(), balance), "Transfer failed");
        emit Withdrawn(owner(), balance);
    }

    /// @notice Recover ETH accidentally sent to this contract.
    receive() external payable {}

    function recoverETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to recover");
        (bool ok,) = owner().call{value: balance}("");
        require(ok, "ETH transfer failed");
    }

    /// @notice Recover any ERC20 accidentally sent here (not USDC mint revenue).
    function recoverERC20(address token) external onlyOwner {
        require(token != address(usdc), "Use withdraw() for USDC");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to recover");
        require(IERC20(token).transfer(owner(), balance), "Transfer failed");
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /// @notice Total number of Based IDs minted so far (including auction reserve).
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice Next token ID that will be issued on public mint.
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice True if tokenId is an auction-reserve ID (#1–#100).
    function isAuctionId(uint256 tokenId) public pure returns (bool) {
        return tokenId >= 1 && tokenId <= AUCTION_RESERVE;
    }

    /// @notice $BASED airdrop weight for a given ID using diminishing-returns formula.
    ///         weight = 1e18 / sqrt(tokenId)  (scaled by 1e18 to avoid decimals)
    ///
    ///         Examples (scaled):
    ///           #1   → 1_000_000_000_000_000_000  (1.000)
    ///           #4   →   500_000_000_000_000_000  (0.500)
    ///           #100 →   100_000_000_000_000_000  (0.100)
    ///
    /// @dev Uses integer square root (Babylonian method).
    function idWeight(uint256 tokenId) public pure returns (uint256) {
        require(tokenId >= 1, "Invalid token ID");
        return 1e18 / _sqrt(tokenId);
    }

    // ─── Metadata ─────────────────────────────────────────────────────────────

    /// @notice Collection-level metadata (OpenSea / Coinbase Wallet standard).
    function contractURI() external pure returns (string memory) {
        bytes memory json = abi.encodePacked(
            '{"name":"Based ID",',
            '"description":"Your permanent sequential identity on Base. The lower the number, the earlier you were. $2 USDC flat. On-chain SVG art.",',
            '"image":"data:image/svg+xml;base64,', _collectionImage(), '",',
            '"external_link":"https://basedid.xyz",',
            '"seller_fee_basis_points":0}'
        );
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(json)
        ));
    }

    /// @notice Returns a fully on-chain data URI with SVG image and JSON metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory idStr    = tokenId.toString();
        string memory holderStr = _addressToString(ownerOf(tokenId));
        bool isAuction          = isAuctionId(tokenId);

        string memory svg  = _buildSVG(idStr, holderStr, isAuction);
        string memory json = _buildJSON(idStr, svg, isAuction);

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ─── Internal: SVG ────────────────────────────────────────────────────────

    function _buildSVG(
        string memory idStr,
        string memory holderStr,
        bool isAuction
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            _svgHeader(idStr, isAuction),
            _svgBody(holderStr, isAuction)
        ));
    }

    function _svgHeader(
        string memory idStr,
        bool isAuction
    ) internal pure returns (string memory) {
        // Auction IDs: gold/amber gradient. Public IDs: blue gradient.
        string memory numGradient = isAuction
            ? '<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#fde68a"/><stop offset="100%" style="stop-color:#d97706"/></linearGradient>'
            : '<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#93c5fd"/><stop offset="100%" style="stop-color:#1d4ed8"/></linearGradient>';

        string memory borderColor  = isAuction ? "#d97706" : "#2563eb";
        string memory accentColor  = isAuction ? "#f59e0b" : "#3b82f6";
        string memory bracketColor = isAuction ? "#d97706" : "#3b82f6";
        string memory fontSize     = _idFontSize(bytes(idStr).length);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">',
            '<defs>',
              '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:#060818"/>',
                '<stop offset="60%" style="stop-color:#080d22"/>',
                '<stop offset="100%" style="stop-color:#0a1030"/>',
              '</linearGradient>',
              numGradient,
              '<pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">',
                '<circle cx="1" cy="1" r="0.9" fill="', accentColor, '" fill-opacity="0.09"/>',
              '</pattern>',
              '<clipPath id="c"><rect width="480" height="270" rx="16"/></clipPath>',
            '</defs>',

            '<rect width="480" height="270" rx="16" fill="url(#bg)"/>',
            '<rect width="480" height="270" rx="16" fill="url(#dots)"/>',

            '<text x="240" y="195" text-anchor="middle"',
            ' font-family="monospace,Courier New" font-size="72" font-weight="900"',
            ' fill="', accentColor, '" fill-opacity="0.055" letter-spacing="0.04em">BASED ID</text>',

            '<polygon points="300,0 480,0 480,120 100,270 0,270 0,150"',
            ' fill="white" fill-opacity="0.015" clip-path="url(#c)"/>',

            '<rect width="480" height="270" rx="16" fill="none" stroke="', borderColor, '" stroke-width="1.5" stroke-opacity="0.45"/>',
            '<line x1="40" y1="0" x2="440" y2="0" stroke="', accentColor, '" stroke-width="2.5" stroke-opacity="0.75" clip-path="url(#c)"/>',

            // Corner brackets
            '<path d="M16,42 L16,16 L42,16" fill="none" stroke="', bracketColor, '" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>',
            '<path d="M438,16 L464,16 L464,42" fill="none" stroke="', bracketColor, '" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>',
            '<path d="M16,228 L16,254 L42,254" fill="none" stroke="', bracketColor, '" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>',
            '<path d="M438,254 L464,254 L464,228" fill="none" stroke="', bracketColor, '" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>',

            // Big gradient number
            '<text x="28" y="185"',
            ' font-family="monospace,Courier New"',
            ' font-size="', fontSize, '"',
            ' font-weight="900"',
            ' fill="url(#ng)"',
            ' letter-spacing="-0.02em">#', idStr, '</text>'
        ));
    }

    function _svgBody(
        string memory holderStr,
        bool isAuction
    ) internal pure returns (string memory) {
        string memory squareColor = isAuction ? "#d97706" : "#2563eb";
        string memory badgeText   = isAuction ? "AUCTION" : "BASE";
        string memory badgeFill   = isAuction ? "#2d1a00" : "#0f1f4a";
        string memory badgeStroke = isAuction ? "#d97706" : "#3b82f6";
        string memory badgeTextColor = isAuction ? "#fde68a" : "#93c5fd";

        return string(abi.encodePacked(
            // Top-left: square + label
            '<rect x="30" y="28" width="13" height="13" rx="2.5" fill="', squareColor, '"/>',
            '<text x="50" y="40" font-family="monospace,Courier New" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.07em">Based ID</text>',

            // Top-right: badge (AUCTION or BASE)
            '<rect x="396" y="21" width="58" height="22" rx="11" fill="', badgeFill, '" fill-opacity="0.9"/>',
            '<rect x="396" y="21" width="58" height="22" rx="11" fill="none" stroke="', badgeStroke, '" stroke-width="0.75" stroke-opacity="0.55"/>',
            '<text x="425" y="36" font-family="monospace,Courier New" font-size="9.5" font-weight="700" fill="', badgeTextColor, '" text-anchor="middle" letter-spacing="0.1em">', badgeText, '</text>',

            // Divider
            '<line x1="28" y1="212" x2="452" y2="212" stroke="#1d4ed8" stroke-width="0.75" stroke-opacity="0.25"/>',

            // Holder
            '<text x="28" y="232" font-family="monospace,Courier New" font-size="8.5" fill="#334155" letter-spacing="0.14em">HOLDER</text>',
            '<text x="28" y="250" font-family="monospace,Courier New" font-size="10.5" fill="#475569" letter-spacing="0.025em">', holderStr, '</text>',

            '</svg>'
        ));
    }

    function _buildJSON(
        string memory idStr,
        string memory svg,
        bool isAuction
    ) internal pure returns (string memory) {
        string memory edition = isAuction ? "Auction Reserve" : "Public Mint";

        return string(abi.encodePacked(
            '{"name":"Based ID #', idStr, '",',
            '"description":"Your permanent onchain identity pass on Base. The lower the number, the earlier you were.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
              '{"trait_type":"ID Number","value":', idStr, '},',
              '{"trait_type":"Network","value":"Base"},',
              '{"trait_type":"Edition","value":"', edition, '"}',
            ']}'
        ));
    }

    function _collectionImage() internal pure returns (string memory) {
        bytes memory svg = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">',
            '<defs>',
              '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:#060818"/>',
                '<stop offset="100%" style="stop-color:#0a1030"/>',
              '</linearGradient>',
              '<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%">',
                '<stop offset="0%" style="stop-color:#93c5fd"/>',
                '<stop offset="100%" style="stop-color:#1d4ed8"/>',
              '</linearGradient>',
              '<pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">',
                '<circle cx="1" cy="1" r="0.9" fill="#3b82f6" fill-opacity="0.09"/>',
              '</pattern>',
            '</defs>',
            '<rect width="480" height="270" rx="16" fill="url(#bg)"/>',
            '<rect width="480" height="270" rx="16" fill="url(#dots)"/>',
            '<rect width="480" height="270" rx="16" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-opacity="0.35"/>',
            '<line x1="40" y1="0" x2="440" y2="0" stroke="#3b82f6" stroke-width="2.5" stroke-opacity="0.65"/>',
            '<rect x="30" y="28" width="13" height="13" rx="2.5" fill="#2563eb"/>',
            '<text x="50" y="40" font-family="monospace,Courier New" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.07em">Based ID</text>',
            '<text x="240" y="160" text-anchor="middle" font-family="monospace,Courier New" font-size="72" font-weight="900" fill="url(#ng)" letter-spacing="-0.02em">BASED ID</text>',
            '<text x="240" y="200" text-anchor="middle" font-family="monospace,Courier New" font-size="13" fill="#475569" letter-spacing="0.1em">YOUR NUMBER ON BASE</text>',
            '</svg>'
        );
        return Base64.encode(svg);
    }

    // ─── Internal: Math ───────────────────────────────────────────────────────

    /// @dev Integer square root (Babylonian method).
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // ─── Internal: Utils ──────────────────────────────────────────────────────

    /// @dev Returns SVG font-size based on digit count so the number always fits.
    function _idFontSize(uint256 digits) internal pure returns (string memory) {
        if (digits <= 3) return "108";
        if (digits <= 4) return "90";
        if (digits <= 5) return "74";
        if (digits <= 6) return "58";
        if (digits <= 7) return "48";
        if (digits <= 8) return "40";
        return "34";
    }

    /// @dev Converts an address to its lowercase hex string (0x...).
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory addrBytes = abi.encodePacked(addr);
        bytes memory hex_      = "0123456789abcdef";
        bytes memory str       = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = hex_[uint8(addrBytes[i] >> 4)];
            str[3 + i * 2] = hex_[uint8(addrBytes[i] & 0x0f)];
        }
        return string(str);
    }
}
