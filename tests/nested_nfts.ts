import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { METAPLEX } from "./consts";
import { BN } from "bn.js";
import path from "path";
import fs from "fs";
import * as anchor from "@project-serum/anchor";

import { NftPda, UserPdaTickets } from "./user";

export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
	return (
		await PublicKey.findProgramAddress(
			[Buffer.from("metadata"), METAPLEX.toBuffer(), mint.toBuffer()],
			METAPLEX
		)
	)[0];
};

export interface RemainStruct {
	pubkey: PublicKey;
	isWritable: boolean;
	isSigner: boolean;
}

export const secNow = (): number => {
	return Math.floor(Date.now() / 1000);
};

export function remainingNftPdas(
	nftPdas: NftPda[],
	isWritable = false,
	isSigner = false
): RemainStruct[] {
	// Map over the array of NftPda instances and create a new object for each
	return nftPdas.map((nftPda) => {
		return {
			pubkey: nftPda.nftPda,
			isWritable: isWritable,
			isSigner: isSigner,
		};
	});
}

// export function createBNArray(length: number, value: number): BN[] {
//   return Array.from({ length }, () => new BN(value));
// }

export function appendAddress(
	existingAccounts: RemainStruct[],
	additionalAddresses: PublicKey[],
	isWritable = false,
	isSigner = false
): RemainStruct[] {
	// Map over the additional addresses and create RemainStruct objects for each
	const newAccounts = additionalAddresses.map((address) => {
		return {
			pubkey: address,
			isWritable: isWritable, // Set to false for immutable
			isSigner: isSigner,
		};
	});

	// Concatenate the existing accounts with the new ones and return
	return existingAccounts.concat(newAccounts);
}

export class Nft {
	holder: NftCollection;
	edition: PublicKey;
	metadata: PublicKey;
	mint: PublicKey;
	owner: PublicKey;

	constructor(
		holder: NftCollection,
		edition: PublicKey,
		metadata: PublicKey,
		mint: PublicKey,
		owner?: PublicKey
	) {
		this.holder = holder;
		this.edition = edition;
		this.metadata = metadata;
		this.mint = mint;
		this.owner = owner;
	}

	updateOwner(newOwner: PublicKey) {
		this.owner = newOwner;
	}

	async getAta(
		pubkey: PublicKey,
		createIfNull: boolean = true
	): Promise<PublicKey> {
		const ata = await getOrCreateAssociatedTokenAccount(
			this.holder.connection,
			this.holder.payer,
			this.mint,
			pubkey,
			createIfNull
		);
		return ata.address;
	}
}

export class NftCollection {
	33333;
	payer: Keypair;
	nfts: Nft[];

	collectionMintKey: PublicKey;
	creatorKey: PublicKey;
	editionKey: PublicKey;

	constructor(connection: Connection, payer: Keypair) {
		this.connection = connection;
		this.payer = payer;
		this.nfts = [];
	}

	setKeys(
		collectionMintKey: PublicKey,
		creatorKey: PublicKey,
		editionKey: PublicKey
	) {
		this.collectionMintKey = collectionMintKey;
		this.creatorKey = creatorKey;
		this.editionKey = editionKey;
	}

	addNft(
		edition: PublicKey,
		metadata: PublicKey,
		mint: PublicKey,
		owner?: PublicKey
	) {
		const nft = new Nft(this, edition, metadata, mint, owner);
		this.nfts.push(nft);
	}
	ownedNfts(owner: PublicKey): [number, number] {
		let startIdx = -1;
		let endIdx = -1;

		// Iterate through the NFTs to find the range of indexes owned by the specified owner
		for (let i = 0; i < this.nfts.length; i++) {
			if (this.nfts[i].owner && this.nfts[i].owner.equals(owner)) {
				if (startIdx === -1) {
					startIdx = i;
				}
				endIdx = i;
			}
		}

		if (startIdx === -1 || endIdx === -1) {
			throw new Error("No NFTs found for the specified owner.");
		}

		return [startIdx, endIdx];
	}
}
