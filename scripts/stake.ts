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

export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [Buffer.from("metadata"), METAPLEX.toBuffer(), mint.toBuffer()],
      METAPLEX
    )
  )[0];
};

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
  const user1 = loadKeypairFromFile("../keys/user1.json");

  let [communityPool0Collection0Pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(COLLECTION_SEED),
      communityPoolPda0.toBuffer(),
      new BN(communityId).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );
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

  const [userNftPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(NFT_TICKET),
      user1Account.toBuffer(),
      user1Community0Account.toBuffer(),
      new BN(0).toArrayLike(Buffer, "be", 4),
    ],
    stakingProgram.programId
  );

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

  console.log("Derived nft: ", userNftPda.toBase58());


  // Fill these out to deploy
  let nft_mint: Pubkey = 8888;
  let nft_edition: Pubkey = 6666;

  // Initialise bondBuyer ATAs for the liquidity_token
  const nftAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    user1,
    nft_mint,
    user1.publicKey
  );

  const nftMetadata = await getMetadata(nft_mint);
  

  try {
    const tx2 = await stakingProgram.methods
      .stakeNft(communityId, 0, 0, 0)
      .accounts({
        mainPool: mainPoolPda,
        user: user1.publicKey,
        userAccount: user1Account,
        userCommunityAccount: user1Community0Account,
        communityPool: communityPoolPda0,
        nftTicket: userNftPda,
        nftMint: nft_mint, // Mint of that singular NFT
        userNftTokenAccount: nftAta,// ATA derived from the mint
        collection: communityPool0Collection0Pda,
        collectionPolicy: communityPool0Collection0Policy0Pda,
        masterMintMetadata: // Can be whatever,
        mintMetadata: nftMetadata, // metadata of the NFT line 110,
        tokenMetadataProgram: METAPLEX,
        editionId: nft_edition // Edition from the metadata,
      })
      .signers([user1])
      .rpc();
  } catch (e) {
    console.log(e);
  }
})();
