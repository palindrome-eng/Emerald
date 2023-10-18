import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Staking } from "../target/types/staking";
import {
  METAPLEX,
  MAIN_SEED,
  COMMUNITY_SEED,
  USER_ACCOUNT_SEED,
  USER_COMMUNITY_ACCOUNT_SEED,
  NFT_TICKET,
  COLLECTION_SEED,
  LAMPORTS_PER_SOL,
  HOUR,
  WEEK,
  MINUTE,
  COMMUNITY_CREATION_FEE,
  COLLECTION_CREATION_FEE,
  UNSTAKE_FEE,
  COLLECTION_POLICY_SEED,
  COLLECTION_POLICY_CREATION_FEE,
} from "../tests/consts";
import { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { loadKeypairFromFile, delay } from "../tests/helper";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
(async () => {
  const mainPoolPda = new PublicKey(
    "CKnH6CDuFLCXDStDaVTcSQFE3eKZR6e3N9mfAyd5pfdH"
  );
  let mintSC;
  let communityPoolPda0ScATa;
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const stakingProgram = anchor.workspace.Staking as Program<Staking>;
  const superAdmin = loadKeypairFromFile("../keys/superAdmin.json");
  const mintAuthSC = loadKeypairFromFile("../keys/mintAuthSC.json");
  let currentCommunityIndex: number;
  async function latestCommunity(mainPoolPdag: PublicKey) {
    let mainState = await stakingProgram.account.mainPool.fetch(mainPoolPdag);
    // console.log("Fetched main state:\n", mainState);
    currentCommunityIndex = parseInt(mainState.totalCommunities.toString());
    // console.log("currentCommunityIndex: ", currentCommunityIndex);
    return parseInt(mainState.totalCommunities.toString());
  }

  let baseCommunityIdx = await latestCommunity(mainPoolPda);
  await delay(1);
  console.log("\n\nbaseCommunityIdx init pool0 start: ", baseCommunityIdx);
  let [communityPoolPda0] = await PublicKey.findProgramAddress(
    [
      Buffer.from(COMMUNITY_SEED),
      mainPoolPda.toBuffer(),
      new BN(baseCommunityIdx).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );

  console.log(
    `Community ${baseCommunityIdx} PDA address: `,
    communityPoolPda0.toString()
  );
  // devnet create SPL token
  mintSC = await createMint(
    provider.connection,
    mintAuthSC,
    mintAuthSC.publicKey,
    mintAuthSC.publicKey,
    10
  );
  console.log("mintSC: ", mintSC.toString());
  //devnet create associated token account
  communityPoolPda0ScATa = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    anchor.Wallet.local().payer,
    mintSC,
    communityPoolPda0,
    true
  );
  console.log(
    "communityPoolPda0ScATa: ",
    communityPoolPda0ScATa.address.toString()
  );
  // devnet mint
  await mintTo(
    provider.connection,
    mintAuthSC,
    mintSC,
    communityPoolPda0ScATa.address,
    mintAuthSC,
    21122112,
    [],
    undefined,
    TOKEN_PROGRAM_ID
  );
  await stakingProgram.methods
    .initialiseCommunity(mintSC, true)
    .accounts({
      admin: superAdmin.publicKey,
      mainPool: mainPoolPda,
      communityPool: communityPoolPda0,
      rewardVault: communityPoolPda0ScATa.address,
    })
    .signers([superAdmin])
    .rpc();
})();
