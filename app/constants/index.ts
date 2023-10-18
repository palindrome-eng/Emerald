import {PublicKey} from "@solana/web3.js";
import {PROGRAM_ID} from "../lib/emerald-solita";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const MAIN_SEED = "main";
export const SNAPSHOT_PEG_SEED = "snapshot_peg";
export const COMMUNITY_SEED = "community_pool";
export const USER_ACCOUNT_SEED = "user_account";
export const USER_COMMUNITY_ACCOUNT_SEED = "user_community_account";
export const COLLECTION_POLICY_SEED = "collection_policy";
export const NFT_TICKET = "nft_ticket";
export const COLLECTION_SEED = "collection";

const [MAIN_POOL] = PublicKey.findProgramAddressSync(
    [Buffer.from(MAIN_SEED)],
    PROGRAM_ID
);
export { MAIN_POOL };