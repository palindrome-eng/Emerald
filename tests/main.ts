import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { BN } from "bn.js";
import * as anchor from "@project-serum/anchor";
import { Emerald } from "../target/types/emerald";
import {
	COMMUNITY_SEED,
	COLLECTION_SEED,
	COLLECTION_POLICY_SEED,
} from "./consts";

export class Policy {
	constructor(
		public address: PublicKey,
		public index: number,
		public minStakePeriod: anchor.BN,
		public epoch: anchor.BN,
		public rate: anchor.BN,
		public offerPeriod: anchor.BN,
		public interactionFrequency: anchor.BN,
		public attenuation: number
	) {}
}

export class Collection {
	policies: Policy[] = [];
	policyCounter: number;

	constructor(
		public parent: Community,
		public address: PublicKey,
		public masterMint: PublicKey,
		public masterEdition: PublicKey,
		public masterMetadata: PublicKey,
		public index: number
	) {
		this.policyCounter = 0;
	}

	async addPolicy(
		minStakePeriod: number,
		epoch: number,
		rate: number,
		offerPeriod: number,
		interactionFrequency: number,
		attenuation: number
	): Promise<Policy> {
		// Derive latest policy
		const [policyAddress] = await PublicKey.findProgramAddress(
			[
				Buffer.from(COLLECTION_POLICY_SEED),
				this.address.toBuffer(),
				this.parent.address.toBuffer(),
				new BN(this.policyCounter).toArrayLike(Buffer, "be", 4),
			],
			this.parent.parent.programId
		);

		// Spawn object and add to the list
		const policy = new Policy(
			policyAddress,
			this.policyCounter,
			new BN(minStakePeriod),
			new BN(epoch),
			new BN(rate),
			new BN(offerPeriod),
			new BN(interactionFrequency),
			attenuation
		);
		this.policies.push(policy);
		this.policyCounter++;
		return policy;
	}
}

export class Community {
	collections: Collection[] = [];
	collectionCounter: number;
	totalUsers: number = 0;

	constructor(
		public parent: Main,
		public admin: Keypair,
		public address: PublicKey,
		public index: number,
		public feesPercent: number,
		public scMint: PublicKey,
		public rewardVault: PublicKey // From one above
	) {
		this.address = address;
		this.index = index;
		this.feesPercent = feesPercent;
		this.collectionCounter = 0;
	}

	findCollection(
		masterMint?: PublicKey,
		masterMetadata?: PublicKey,
		masterEdition?: PublicKey
	): Collection | null {
		const collection = this.collections.find(
			(col) =>
				(masterMint && col.masterMint.equals(masterMint)) ||
				(masterMetadata && col.masterMetadata.equals(masterMetadata)) ||
				(masterEdition && col.masterEdition.equals(masterEdition))
		);
		return collection || null;
	}

	async getState() {
		return await this.parent.program.account.communityPool.fetch(this.address);
	}

	incTotalUsers() {
		this.totalUsers++;
	}

	coolArrIdxByChainIdx(targetIndex: number): number | null {
		const collectionIndex = this.collections.findIndex(
			(collection) => collection.index === targetIndex
		);
		return collectionIndex !== -1 ? collectionIndex : null;
	}

	async getScAta(address: PublicKey): Promise<PublicKey> {
		let scATa = await getOrCreateAssociatedTokenAccount(
			this.parent.connection,
			this.parent.payer,
			this.scMint,
			address,
			true
		);

		return scATa.address;
	}

	async getAdminAta(): Promise<PublicKey> {
		let adminATa = await getOrCreateAssociatedTokenAccount(
			this.parent.connection,
			this.parent.payer,
			this.scMint,
			this.admin.publicKey,
			true
		);

		return adminATa.address;
	}

	async addCollection(
		masterMint: PublicKey,
		masterEdition: PublicKey,
		masterMetadata: PublicKey
	): Promise<Collection> {
		// Get address of collection policy
		const [collectionPda] = await PublicKey.findProgramAddress(
			[
				Buffer.from(COLLECTION_SEED),
				this.address.toBuffer(),
				new BN(this.collectionCounter).toArrayLike(Buffer, "be", 4),
			],
			this.parent.programId
		);

		const collection = new Collection(
			this,
			collectionPda,
			masterMint,
			masterEdition,
			masterMetadata,
			this.collectionCounter
		);
		this.collections.push(collection);

		// Increment counter
		this.collectionCounter++;
		return collection;
	}
}

export class Main {
	communities: Community[] = [];
	programId: PublicKey;
	constructor(
		public connection: Connection,
		public communitiesCounter: number,
		public address: PublicKey,
		public program: anchor.Program<Emerald>,
		public superAdmin: Keypair,
		public payer: Keypair
	) {
		this.programId = program.programId;
	}

	comByChainIdx(communityIdx: number): Community | null {
		const community = this.communities.find(
			(community) => community.index === communityIdx
		);
		return community || null;
	}

	async addCommunity(
		baseStabelCoin: PublicKey,
		admin: Keypair = this.superAdmin,
		feesPercent: number = 1
	): Promise<Community> {
		// Derive community PDA address
		const [communityPda] = await PublicKey.findProgramAddress(
			[
				Buffer.from(COMMUNITY_SEED),
				this.address.toBuffer(),
				new BN(this.communitiesCounter).toArrayLike(Buffer, "be", 4),
			],
			this.programId
		);

		// Derive community reward vault PDA address
		let rewardVaultAta = await getOrCreateAssociatedTokenAccount(
			this.connection,
			this.payer,
			baseStabelCoin,
			communityPda,
			true
		);

		const community = new Community(
			this,
			admin,
			communityPda,
			this.communitiesCounter,
			feesPercent,
			baseStabelCoin,
			rewardVaultAta.address
		);
		// add and increment counter
		this.communities.push(community);
		this.communitiesCounter++;
		return community;
	}
}
