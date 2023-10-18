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
  const communityPoolPda0 = new PublicKey(
    "GUzUV3dfkTaXzEePndqaKpqTKdMRHnLGoFaHH2hbyDUY"
  );
  //   const baseCommunityIdx
  //   const collectionMintKey
  //   const editionKey
  //   const creatorKey
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const stakingProgram = anchor.workspace.Staking as Program<Staking>;
  const superAdmin = loadKeypairFromFile("../keys/superAdmin.json");
  const communityId = 0;

  let [communityPool0Collection0Pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(COLLECTION_SEED),
      communityPoolPda0.toBuffer(),
      new BN(communityId).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );
  console.log(
    "community pool 0 collection 0 pda == collection Address:",
    communityPool0Collection0Pda.toString()
  );

  await stakingProgram.methods
    .addCollection(
      communityId,
      new PublicKey("45LcYq6KeTYCufeKJwN9TmEZYEDqMEmpegBmrxCB4Ext"),
      new PublicKey("GUzUV3dfkTaXzEePndqaKpqTKdMRHnLGoFaHH2hbyDUY"),
      new PublicKey("7YP3TWKydFyfH9iqXnXCqbLtdSnRLacvL9LrrsKMqDvF")
      // new BN(payoutNftCollection1),
      // new BN(MINUTE), // Epoch of one minte,
      // new BN(0) // Change for test
    )
    .accounts({
      admin: superAdmin.publicKey,
      mainPool: mainPoolPda,
      communityPool: communityPoolPda0,
      collection: communityPool0Collection0Pda,
    })
    .signers([superAdmin])
    .rpc();
})();
