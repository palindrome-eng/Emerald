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
(async () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  async function topUp(topUpAcc: PublicKey) {
    {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          topUpAcc,
          200 * LAMPORTS_PER_SOL
        )
      );
    }
  }
  const stakingProgram = anchor.workspace.Staking as Program<Staking>;
  const superAdmin = loadKeypairFromFile("../keys/superAdmin.json");
  console.log("superAdmin pubKey", superAdmin.publicKey.toString());
  const user1 = loadKeypairFromFile("../keys/user1.json");
  console.log("user1 pubKey", user1.publicKey.toString());
  if (provider.connection.rpcEndpoint.includes("localhost")) {
    await topUp(superAdmin.publicKey);
    await topUp(user1.publicKey);
  }

  let [mainPoolPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(MAIN_SEED)],
    stakingProgram.programId
  );
  console.log("mainPoolPda", mainPoolPda.toString());
  // initialise main pool
  await stakingProgram.methods
    .initialiseMain(
      new BN(COMMUNITY_CREATION_FEE),
      new BN(COLLECTION_CREATION_FEE),
      new BN(UNSTAKE_FEE),
      new BN(COLLECTION_POLICY_CREATION_FEE)
    )
    .accounts({
      superAdmin: superAdmin.publicKey,
      mainPool: mainPoolPda,
    })
    .signers([superAdmin])
    .rpc();

  let [user1Account] = await PublicKey.findProgramAddress(
    [
      Buffer.from(USER_ACCOUNT_SEED),
      user1.publicKey.toBuffer(),
      mainPoolPda.toBuffer(),
    ],
    stakingProgram.programId
  );
  // initialise user account

  await stakingProgram.methods
    .initialiseUserAccount()
    .accounts({
      user: user1.publicKey,
      mainPool: mainPoolPda,
      userAccount: user1Account,
    })
    .signers([user1])
    .rpc();

  //   let currentCommunityIndex: number;
  //   async function latestCommunity(mainPoolPdag: PublicKey) {
  //     let mainState = await stakingProgram.account.mainPool.fetch(mainPoolPdag);
  //     // console.log("Fetched main state:\n", mainState);
  //     currentCommunityIndex = parseInt(mainState.totalCommunities.toString());
  //     // console.log("currentCommunityIndex: ", currentCommunityIndex);
  //     return parseInt(mainState.totalCommunities.toString());
  //   }

  //   let baseCommunityIdx = await latestCommunity(mainPoolPda);
  //   delay(1);
  //   console.log("\n\nbaseCommunityIdx init pool0 start: ", baseCommunityIdx);
})();
