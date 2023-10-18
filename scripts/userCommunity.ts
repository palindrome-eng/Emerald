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
  let communityId = 0;
  let [mainPoolPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(MAIN_SEED)],
    stakingProgram.programId
  );
  console.log("mainPoolPda", mainPoolPda.toString());
  const [user1Account] = await PublicKey.findProgramAddress(
    [
      Buffer.from(USER_ACCOUNT_SEED),
      user1.publicKey.toBuffer(),
      mainPoolPda.toBuffer(),
    ],
    stakingProgram.programId
  );
  let [user1Community0Account] = await PublicKey.findProgramAddress(
    [
      Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
      user1.publicKey.toBuffer(),
      user1Account.toBuffer(),
      new BN(0).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );
  console.log("user1Community0Account:", user1Community0Account.toString());
  const [communityPoolPda0] = await PublicKey.findProgramAddress(
    [
      Buffer.from(COMMUNITY_SEED),
      mainPoolPda.toBuffer(),
      new BN(communityId).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );

  await stakingProgram.methods
    .initialiseUserCommunityAccount(communityId)
    .accounts({
      user: user1.publicKey,
      mainPool: mainPoolPda,
      communityPool: communityPoolPda0,
      userAccount: user1Account,
      userCommunityAccount: user1Community0Account,
    })
    .signers([user1])
    .rpc();
})();
