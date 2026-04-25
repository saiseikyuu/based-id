// Contract addresses
// Replace BASED_ID_ADDRESS with your deployed contract address after deployment

export const BASED_ID_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// USDC on Base mainnet
export const USDC_ADDRESS_MAINNET =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// USDC on Base Sepolia
export const USDC_ADDRESS_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_CHAIN_ID === "8453"
  ? USDC_ADDRESS_MAINNET
  : USDC_ADDRESS_SEPOLIA) as `0x${string}`;

export const MINT_PRICE = BigInt(2_000_000); // $2 USDC (6 decimals)

/// IDs #1–AUCTION_RESERVE are reserved for auction (minted free via ownerMint)
export const AUCTION_RESERVE = 100;

/// Returns true if a token ID is an auction-reserve ID (#1–#100)
export function isAuctionId(tokenId: number | bigint): boolean {
  return Number(tokenId) >= 1 && Number(tokenId) <= AUCTION_RESERVE;
}

export const AUCTION_HOUSE_ADDRESS = (process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const BASESCAN_URL =
  process.env.NEXT_PUBLIC_CHAIN_ID === "8453"
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";

// Block at which the BasedID contract was deployed.
// Using this instead of BigInt(0) avoids public RPC block-range limits.
export const DEPLOY_BLOCK =
  process.env.NEXT_PUBLIC_CHAIN_ID === "8453"
    ? BigInt(45102399)  // Base mainnet deploy block
    : BigInt(0);         // Sepolia — chain is short enough

export const BASED_ID_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextTokenId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MINT_PRICE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "contractURI",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mintingPaused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setPaused",
    inputs: [{ name: "paused", type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recoverETH",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recoverERC20",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ownerMint",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAuctionId",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "idWeight",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "AUCTION_RESERVE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reserveMinted",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ReserveMinted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "count", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const AUCTION_HOUSE_ABI = [
  {
    type: "function",
    name: "createAuction",
    inputs: [
      { name: "tokenId",      type: "uint256" },
      { name: "reservePrice", type: "uint256" },
      { name: "duration",     type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bid",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settle",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelAuction",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "auctions",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "seller",       type: "address" },
      { name: "topBidder",    type: "address" },
      { name: "topBid",       type: "uint256" },
      { name: "reservePrice", type: "uint256" },
      { name: "startTime",    type: "uint256" },
      { name: "endTime",      type: "uint256" },
      { name: "settled",      type: "bool"    },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActive",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minNextBid",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "timeRemaining",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_INCREMENT_BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AuctionCreated",
    inputs: [
      { name: "tokenId",      type: "uint256", indexed: true  },
      { name: "seller",       type: "address", indexed: true  },
      { name: "reservePrice", type: "uint256", indexed: false },
      { name: "startTime",    type: "uint256", indexed: false },
      { name: "endTime",      type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BidPlaced",
    inputs: [
      { name: "tokenId",    type: "uint256", indexed: true  },
      { name: "bidder",     type: "address", indexed: true  },
      { name: "amount",     type: "uint256", indexed: false },
      { name: "newEndTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AuctionSettled",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true  },
      { name: "winner",  type: "address", indexed: true  },
      { name: "amount",  type: "uint256", indexed: false },
    ],
  },
] as const;

// Based Hunters — soulbound leveling NFT
export const HUNTERS_ADDRESS = (process.env.NEXT_PUBLIC_HUNTERS_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const HUNTERS_ABI = [
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateRank",
    inputs: [
      { name: "wallet",   type: "address" },
      { name: "newRank",  type: "uint8"   },
      { name: "nonce",    type: "uint256" },
      { name: "sig",      type: "bytes"   },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenOf",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rankOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nonces",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "wallet",  type: "address", indexed: true  },
      { name: "tokenId", type: "uint256", indexed: true  },
    ],
  },
  {
    type: "event",
    name: "RankUpdated",
    inputs: [
      { name: "wallet",  type: "address", indexed: true  },
      { name: "tokenId", type: "uint256", indexed: true  },
      { name: "newRank", type: "uint8",   indexed: false },
    ],
  },
] as const;

export const RANK_LABELS = ["E", "D", "C", "B", "A", "S", "N"] as const;
export const RANK_NAMES  = [
  "E-Rank Hunter", "D-Rank Hunter", "C-Rank Hunter",
  "B-Rank Hunter", "A-Rank Hunter", "S-Rank Hunter", "National Hunter",
] as const;
export const RANK_COLORS = [
  "#71717a", // E — zinc
  "#84cc16", // D — lime
  "#22c55e", // C — green
  "#3b82f6", // B — blue
  "#a855f7", // A — purple
  "#f97316", // S — orange
  "#fbbf24", // N — gold
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
