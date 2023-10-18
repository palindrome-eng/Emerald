import {
  PublicKey,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { METAPLEX } from "./consts";
import { BN } from "bn.js";
import path from "path";
import fs from "fs";
import * as anchor from "@project-serum/anchor";
import {
  keypairIdentity,
  KeypairIdentityDriver,
  Metaplex,
  toBigNumber,
  token,
  TransferNftInput,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";

import {
  createMint,
  createAccount,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  transfer,
  Account,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// import { getBalance } from "./helper";

export class NftMint1 {
  constructor(
    public parent: NftMint0,
    public mint: PublicKey,
    public owner: PublicKey,
    public edition: PublicKey,
    public metadata: PublicKey
  ) {}

  async getAta(pubkey: PublicKey): Promise<PublicKey> {
    const ata = await this.parent.parent.getAta(pubkey, this.mint);
    return ata;
  }

  async updateOwner(owner: PublicKey) {
    this.owner = owner;
  }

  async transferFromMinter(ownerNew: PublicKey) {
    // get ATAs
    let newOwnerAta = await this.getAta(ownerNew);
    let currentOwnerAta = await this.getAta(this.owner);

    await transfer(
      this.parent.parent.connection,
      this.parent.parent.payer,
      currentOwnerAta,
      newOwnerAta,
      this.owner,
      1,
      [this.parent.parent.payer]
    );

    // Update owner
    this.owner = ownerNew;
  }
}

// Colelction starter
export class NftMint0 {
  nfts: NftMint1[] = [];
  uri: string = "";

  constructor(
    public parent: CollectionsMaster,
    public masterMint: PublicKey,
    public masterEdition: PublicKey,
    public masterMetadata: PublicKey,
    uri = "fuck_that"
  ) {}

  async addNFTMint(mint: PublicKey, owner: PublicKey) {
    // Get edition
    const edition = this.parent.metaplex.nfts().pdas().edition({ mint });
    const metadata = await this.parent.getMetadata(mint);
    const nftMint = new NftMint1(this, mint, owner, edition, metadata);
    this.nfts.push(nftMint);
  }

  async addNftCollection(
    index: number,
    collection: PublicKey,
    keypair: Keypair,
    uri: string = this.uri
  ) {
    const mintNFTResponse = await this.parent.metaplex.nfts().create({
      uri,
      maxSupply: 1,
      name: `The Anon Club #${index}`,
      primarySaleHappened: true,
      isMutable: true,
      sellerFeeBasisPoints: 500,
      symbol: "ANON",
      updateAuthority: keypair,
      collection,
      collectionAuthority: keypair,
    });

    this.addNFTMint(mintNFTResponse.mintAddress, keypair.publicKey);
    console.log(`${index}: `, mintNFTResponse.mintAddress.toBase58());
  }

  getNftByMint(mint: PublicKey): NftMint1 | undefined {
    return this.nfts.find((nft) => nft.mint.equals(mint));
  }

  async premintNFTs(numberOfNfts: number, uri?: string) {
    for (let index = 0; index < numberOfNfts; index++) {
      await this.addNftCollection(
        index,
        this.masterMint,
        this.parent.payer,
        uri
      );
    }

    console.log(`Preminted ${numberOfNfts} NFTs in this collection.`);
  }
}

export class CollectionsMaster {
  collections: NftMint0[] = [];

  constructor(
    public connection: Connection,
    public payer: Keypair,
    public metaplex: Metaplex
  ) {}

  async getMetadata(mint: PublicKey): Promise<PublicKey> {
    return (
      await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), METAPLEX.toBuffer(), mint.toBuffer()],
        METAPLEX
      )
    )[0];
  }

  async getAta(pubkey: PublicKey, mint: PublicKey): Promise<PublicKey> {
    const ata = await getOrCreateAssociatedTokenAccount(
      this.connection, // Access connection from grandparent
      this.payer, // Access payer from grandparent
      mint,
      pubkey,
      true
    );
    return ata.address;
  }

  async getBalance(address: PublicKey): Promise<[number, number]> {
    let lamports = await this.connection.getBalance(address);
    const startingBalanceSOL = lamports / LAMPORTS_PER_SOL;
    return [startingBalanceSOL, lamports];
  }

  async initializeCollection(
    uri: string,
    keypair: Keypair = this.payer,
    name: string = "The Anon club",
    symbol: string = "ANON"
  ) {
    //
    console.log("Collection auth: ", keypair.publicKey.toBase58());
    const mintNFTResponse = await this.metaplex.nfts().create({
      uri,
      name,
      primarySaleHappened: false,
      isMutable: true,
      sellerFeeBasisPoints: 500,
      symbol,
      updateAuthority: keypair,
      isCollection: true,
      collectionIsSized: true,
    });

    // metaplex.use(keypairIdentity(<keypair>))

    const masterEdition = this.metaplex
      .nfts()
      .pdas()
      .edition({ mint: mintNFTResponse.mintAddress });

    // Add to the collection
    const newCollection = new NftMint0(
      this,
      new PublicKey(mintNFTResponse.mintAddress),
      masterEdition,
      await this.getMetadata(mintNFTResponse.mintAddress)
    );
    this.collections.push(newCollection);

    console.log("Collection address: ", mintNFTResponse.mintAddress.toBase58());

    return mintNFTResponse.mintAddress;
  }
}
