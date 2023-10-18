import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { BN } from "bn.js";
import * as anchor from "@project-serum/anchor";
import {
  USER_ACCOUNT_SEED,
  USER_COMMUNITY_ACCOUNT_SEED,
  DELEGATE_SEED,
  NFT_TICKET,
} from "./consts";

export class StakedNft {
  constructor(
    public mint: PublicKey,
    public ticketPda: PublicKey,
    public communityAddress: PublicKey,
    public userCommunityAddress: PublicKey,
    public collectionAddress: PublicKey,
    public policyAddress: PublicKey,
    public stakeTime: number,
    public collectionIdx: number,
    public policyIdx: number,
    public communityIdx: number
  ) {}
}

export class UserCommunity {
  stakedNfts: StakedNft[] = [];

  constructor(
    public parent: User,
    public userCommunityAddress: PublicKey,
    public communityAddress: PublicKey,
    public communityIdx: number,
    public index: number
  ) {}

  public getByMint(mint: PublicKey): StakedNft | null {
    const foundNft = this.stakedNfts.find((stakedNft) =>
      stakedNft.mint.equals(mint)
    );
    return foundNft ? foundNft : null;
  }

  async stakeNft(
    nft_mint: PublicKey,
    collectionAddress: PublicKey,
    policyAddress: PublicKey,
    collectionIdx: number,
    policyIdx: number,
    stakeTime: number = Date.now() / 1000
  ) {
    const [nft_stake_pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from(NFT_TICKET),
        this.parent.userMainAccount.toBuffer(),
        this.userCommunityAddress.toBuffer(),
        nft_mint.toBuffer(),
      ],
      this.parent.parent.stakingProgramId
    );

    // Take out from unstaked
    const index = this.parent.unstakedNfts.findIndex((nft) =>
      nft.equals(nft_mint)
    );

    if (index !== -1) {
      this.parent.unstakedNfts.splice(index, 1); // Remove from unstaked

      // Create type to push
      let newStaked: StakedNft = {
        mint: nft_mint,
        ticketPda: nft_stake_pda,
        collectionAddress: collectionAddress,
        policyAddress: policyAddress,
        stakeTime: stakeTime,
        communityAddress: this.communityAddress,
        userCommunityAddress: this.userCommunityAddress,
        communityIdx: this.communityIdx,
        collectionIdx: collectionIdx,
        policyIdx: policyIdx,
      };
      this.stakedNfts.push(newStaked); // Add to staked
    } else {
      console.error("NFT not found in the unstaked array.");
    }
  }
}

export class Delegate {
  constructor(public address: PublicKey) {}
  delegatePublicKey: PublicKey;
}

export class User {
  communityAccount: UserCommunity[] = [];
  unstakedNfts: PublicKey[] = [];
  userCommunityCounter: number = 0;
  delegate: Delegate | null = null;
  constructor(
    public parent: Users,
    public keypair: Keypair,
    public userMainAccount: PublicKey
  ) {}

  // Adds an NFT this usr owns
  addNft(nft_mint: PublicKey) {
    this.unstakedNfts.push(nft_mint);
  }
  async addDelegate(delegatePublickey?: PublicKey) {
    let [delegatePda] = await PublicKey.findProgramAddress(
      [Buffer.from(DELEGATE_SEED), this.userMainAccount.toBuffer()],
      this.parent.stakingProgramId
    );

    this.delegate = new Delegate(delegatePda);

    if (delegatePublickey) {
      this.delegate.delegatePublicKey = delegatePublickey;
    }
  }

  getByCommunityIdx(communityIdx: number): UserCommunity | null {
    const foundCommunity = this.communityAccount.find(
      (community) => community.communityIdx === communityIdx
    );
    return foundCommunity ? foundCommunity : null;
  }

  getAllStakedNfts(): StakedNft[] {
    const allStakedNfts: StakedNft[] = [];

    this.communityAccount.forEach((community) => {
      allStakedNfts.push(...community.stakedNfts);
    });

    return allStakedNfts;
  }

  async addCommunityAccount(communityAccount: PublicKey, communityIdx: number) {
    const [userCommunityAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
        this.keypair.publicKey.toBuffer(),
        this.userMainAccount.toBuffer(),
        new BN(this.userCommunityCounter).toArrayLike(Buffer, "be", 4),
      ],
      this.parent.stakingProgramId
    );

    // New user community account
    const newUserCommunity = new UserCommunity(
      this,
      userCommunityAccount,
      communityAccount,
      communityIdx,
      this.userCommunityCounter
    );
    this.communityAccount.push(newUserCommunity);
    this.userCommunityCounter++;
  }
}

export class Users {
  users: User[] = [];
  async addUser(): Promise<User> {
    const keypair = anchor.web3.Keypair.generate();

    // Derive main account
    const [userMainAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from(USER_ACCOUNT_SEED),
        keypair.publicKey.toBuffer(),
        this.mainPoolPda.toBuffer(),
      ],
      this.stakingProgramId
    );

    const newUser = new User(this, keypair, userMainAccount);
    this.users.push(newUser);

    return newUser;
  }

  constructor(
    public mainPoolPda: PublicKey,
    public stakingProgramId: PublicKey
  ) {}
}
