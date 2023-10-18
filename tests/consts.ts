import { PublicKey, Keypair, Connection } from "@solana/web3.js";

export const METAPLEX = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const MAIN_SEED = "main";
export const DELEGATE_SEED = "delegate";
export const SNAPSHOT_PEG_SEED = "snapshot_peg";
export const COMMUNITY_SEED = "community_pool";
export const USER_ACCOUNT_SEED = "user_account";
export const USER_COMMUNITY_ACCOUNT_SEED = "user_community_account";
export const COLLECTION_POLICY_SEED = "collection_policy";

export const NFT_TICKET = "nft_ticket";
export const COLLECTION_SEED = "collection";
export const LAMPORTS_PER_SOL = 1000000000;

export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
export const WEEK = 604800;

export const COMMUNITY_CREATION_FEE = 1 * LAMPORTS_PER_SOL;
export const COLLECTION_CREATION_FEE = 0.2 * LAMPORTS_PER_SOL;
export const COLLECTION_POLICY_CREATION_FEE = 0.1 * LAMPORTS_PER_SOL;

export const USER_COMMUNITY_ACCOUNT_CREATION_FEE = 0.05 * LAMPORTS_PER_SOL;
export const UNSTAKE_FEE = 0.0002112 * LAMPORTS_PER_SOL;
