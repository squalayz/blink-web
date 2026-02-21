// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Match NFT Minting (Base L2)
//
// When both users accept a match, they can mint it as an NFT.
// Mint fee: 0.01 ETH → platform wallet via smart contract.
// Both users receive a copy (2 NFTs per match).
// On-chain SVG with generative background based on score tier.
// 5% royalty on secondary sales (EIP-2981).
// ══════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import { getProvider, getSigner, FEES } from "./wallet";

// Contract address — set after deploying MishMeshMatch.sol to Base
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "";

// Minimal ABI for minting
const MINT_ABI = [
  "function mintMatch(address recipientA, address recipientB, string userAName, string userBName, uint256 score, string reasoning, string matchDate, string matchId) external payable",
  "function nextTokenId() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function generateSVG(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "event MatchMinted(uint256 indexed tokenIdA, uint256 indexed tokenIdB, string matchId)",
];

export const NFT_MINT_FEE = 0.01; // 0.01 ETH per mint

export interface MintResult {
  success: boolean;
  tokenIdA?: number;
  tokenIdB?: number;
  txHash?: string;
  error?: string;
}

export interface MatchNFTMetadata {
  userAName: string;
  userBName: string;
  score: number;          // 0-100
  reasoning: string;
  matchDate: string;
  matchId: string;
  userAWallet: string;
  userBWallet: string;
}

/**
 * Mint a match NFT — called from the minting user's wallet.
 * Sends 0.01 ETH to the contract, which forwards to platform wallet.
 * Both matched users receive a copy.
 */
export async function mintMatchNFT(
  minterEncryptedKey: string,
  metadata: MatchNFTMetadata
): Promise<MintResult> {
  if (!NFT_CONTRACT_ADDRESS) {
    return { success: false, error: "NFT contract not deployed yet. Set NFT_CONTRACT_ADDRESS." };
  }

  try {
    const signer = getSigner(minterEncryptedKey);
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, MINT_ABI, signer);

    // Truncate reasoning to 200 chars for on-chain storage
    const reasoning = metadata.reasoning.length > 200
      ? metadata.reasoning.slice(0, 197) + "..."
      : metadata.reasoning;

    const tx = await contract.mintMatch(
      metadata.userAWallet,
      metadata.userBWallet,
      metadata.userAName,
      metadata.userBName,
      BigInt(Math.round(metadata.score)),
      reasoning,
      metadata.matchDate,
      metadata.matchId,
      { value: ethers.parseEther(NFT_MINT_FEE.toString()) }
    );

    const receipt = await tx.wait();

    // Parse MatchMinted event to get token IDs
    let tokenIdA: number | undefined;
    let tokenIdB: number | undefined;

    for (const log of receipt.logs) {
      try {
        const iface = new ethers.Interface(MINT_ABI);
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === "MatchMinted") {
          tokenIdA = Number(parsed.args.tokenIdA);
          tokenIdB = Number(parsed.args.tokenIdB);
        }
      } catch {} // Skip non-matching logs
    }

    return {
      success: true,
      tokenIdA,
      tokenIdB,
      txHash: receipt.hash,
    };
  } catch (err: any) {
    console.error("NFT mint failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get NFT metadata URI for a token.
 */
export async function getNFTTokenURI(tokenId: number): Promise<string | null> {
  if (!NFT_CONTRACT_ADDRESS) return null;
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, MINT_ABI, provider);
    return await contract.tokenURI(tokenId);
  } catch {
    return null;
  }
}

/**
 * Get the generative SVG for a token.
 */
export async function getNFTSvg(tokenId: number): Promise<string | null> {
  if (!NFT_CONTRACT_ADDRESS) return null;
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, MINT_ABI, provider);
    return await contract.generateSVG(tokenId);
  } catch {
    return null;
  }
}

/**
 * Generate an off-chain preview SVG (for pre-mint display).
 * Same visual as the on-chain version.
 */
export function generatePreviewSVG(
  userA: string, userB: string, score: number, matchDate: string
): string {
  let c1: string, c2: string, tier: string;

  if (score >= 90)      { c1 = "#FFD700"; c2 = "#FF6B00"; tier = "LEGENDARY"; }
  else if (score >= 75) { c1 = "#A855F7"; c2 = "#6366F1"; tier = "EPIC"; }
  else if (score >= 60) { c1 = "#06B6D4"; c2 = "#3B82F6"; tier = "RARE"; }
  else                  { c1 = "#6366F1"; c2 = "#8B5CF6"; tier = "COMMON"; }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="600" height="600" fill="#0a0a0f"/>
    <rect x="20" y="20" width="560" height="560" rx="24" fill="url(#bg)" opacity="0.15"/>
    <text x="300" y="80" text-anchor="middle" fill="white" font-size="14" opacity="0.5">MishMesh.ai</text>
    <text x="300" y="240" text-anchor="middle" fill="white" font-size="28" font-weight="bold">${userA}</text>
    <text x="300" y="290" text-anchor="middle" fill="${c1}" font-size="40" font-weight="bold">×</text>
    <text x="300" y="340" text-anchor="middle" fill="white" font-size="28" font-weight="bold">${userB}</text>
    <text x="300" y="430" text-anchor="middle" fill="${c1}" font-size="64" font-weight="bold">${score}%</text>
    <text x="300" y="470" text-anchor="middle" fill="white" font-size="12" opacity="0.6">${tier} MATCH</text>
    <text x="300" y="550" text-anchor="middle" fill="white" font-size="11" opacity="0.3">${matchDate}</text>
  </svg>`;
}

/**
 * Score tier for display.
 */
export function getScoreTier(score: number): { tier: string; color: string } {
  if (score >= 90) return { tier: "Legendary", color: "#FFD700" };
  if (score >= 75) return { tier: "Epic", color: "#A855F7" };
  if (score >= 60) return { tier: "Rare", color: "#06B6D4" };
  return { tier: "Common", color: "#6366F1" };
}
