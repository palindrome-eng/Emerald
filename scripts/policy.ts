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
  //   console.log(
  //     "community pool 0 collection 0 pda == collection Address:",
  //     communityPool0Collection0Pda.toString()
  //   );

  let [communityPool0Collection0Policy0Pda] =
    await PublicKey.findProgramAddress(
      [
        Buffer.from(COLLECTION_POLICY_SEED),
        communityPool0Collection0Pda.toBuffer(),
        communityPoolPda0.toBuffer(),
        new BN(communityId).toArrayLike(Buffer, "be", 4),
      ],
      stakingProgram.programId
    );

  console.log(
    "communityPool0Collection0Policy0Pda == policy address: ",
    communityPool0Collection0Policy0Pda.toBase58()
  );

  await stakingProgram.methods
    .addCollectionPolicy(
      communityId,
      0, // Collection Id
      new BN(60),
      new BN(MINUTE), // Epoch of one minte,
      new BN(0), // Minnimum stake
      true, // There is interaction penalty
      new BN(10), // Penalty if not interacted every 10s
      950, //  Penalty of 5%
      false,
      new BN(0)
    )
    .accounts({
      admin: superAdmin.publicKey,
      mainPool: mainPoolPda,
      communityPool: communityPoolPda0,
      collectionPolicy: communityPool0Collection0Policy0Pda,
      collection: communityPool0Collection0Pda,
    })
    .signers([superAdmin])
    .rpc();
})();
