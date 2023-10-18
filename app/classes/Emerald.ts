import {Connection, PublicKey} from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import {
    COLLECTION_POLICY_SEED,
    COLLECTION_SEED,
    COMMUNITY_SEED,
    MAIN_POOL, MAIN_SEED, NFT_TICKET, SNAPSHOT_PEG_SEED,
    USER_ACCOUNT_SEED,
    USER_COMMUNITY_ACCOUNT_SEED
} from "../constants";
import {
    Collection,
    CollectionPolicy,
    CommunityPool,
    createAddCollectionInstruction,
    createAddCollectionPolicyInstruction, createClaimSingleInstruction,
    createInitialiseCommunityInstruction,
    createInitialiseUserAccountInstruction,
    createInitialiseUserCommunityAccountInstruction, createStakeNftInstruction, createUnstakeNftInstruction,
    MainPool,
    PROGRAM_ID,
    UserAccount, UserCommunityAccount
} from "../lib/emerald-solita";
import {BN} from "@coral-xyz/anchor";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";

const tokenMetadataProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

class Emerald {
    public connection: Connection;
    public metaplex: Metaplex;
    public mainPool = MAIN_POOL;

    private constructor(
        connection: Connection,
    ) {
        this.connection = connection;
        this.metaplex = new Metaplex(connection);
    }

    async getProtocolData() {
        return await MainPool.fromAccountAddress(this.connection, this.mainPool);
    }

    async createNewCommunity(rewardMint: PublicKey, admin: PublicKey) {
        const mainPoolData = await MainPool.fromAccountAddress(this.connection, this.mainPool);

        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(mainPoolData.totalCommunities)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const rewardVault = getAssociatedTokenAddressSync(
            rewardMint,
            communityPool,
            true
        );

        const ix1 = createAssociatedTokenAccountInstruction(
            admin,
            rewardVault,
            communityPool,
            rewardMint
        );

        const ix2 = createInitialiseCommunityInstruction(
            {
                mainPool: this.mainPool,
                coinMint: rewardMint,
                communityPool,
                rewardVault,
                admin
            },
            {
                feeReduction: 100
            },
            PROGRAM_ID
        );

        return [ix1, ix2];
    }

    async addCollectionToCommunity(
        communityId: number,
        admin: PublicKey,
        verifiedCollectionAddress: PublicKey,
        verifiedCreator?: PublicKey,
    ) {
        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const communityPoolData = await CommunityPool.fromAccountAddress(this.connection, communityPool);
        const [collectionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_SEED),
                communityPool.toBuffer(),
                new BN(communityPoolData.collectionsIdx).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const ix = createAddCollectionInstruction(
            {
                admin,
                communityPool,
                mainPool: MAIN_POOL,
                collection: collectionPda
            },
            {
                verifiedCreator: !!verifiedCreator,
                creatorKey: verifiedCreator,
                communityIdx: 0,
                masterCollectionKey: verifiedCollectionAddress,
                masterEditionKey: new PublicKey(0)
            },
            PROGRAM_ID
        );

        return ix;
    }

    async addCollectionPolicy(
        communityId: number,
        collectionId: number,
        policy: CollectionPolicy,
    ) {
        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const communityPoolData = await CommunityPool.fromAccountAddress(this.connection, communityPool);

        const [collectionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_SEED),
                communityPool.toBuffer(),
                new BN(collectionId).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const collectionData = await Collection.fromAccountAddress(this.connection, collectionPda);
        const [collectionPolicyPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_POLICY_SEED),
                collectionPda.toBuffer(),
                communityPool.toBuffer(),
                (new BN(collectionData.totalPolicies)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const ix = createAddCollectionPolicyInstruction(
            {
                admin: communityPoolData.communityAdmin,
                communityPool,
                collection: collectionPda,
                mainPool: MAIN_POOL,
                collectionPolicy: collectionPolicyPda
            },
            {
                ...policy,
                collectionIdx: collectionId,
                communityIdx: communityId,
            },
            PROGRAM_ID
        );

        return ix;
    }

    async initializeUserGlobalAccount(user: PublicKey) {
        const [pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_ACCOUNT_SEED),
                user.toBuffer(),
                MAIN_POOL.toBuffer()
            ],
            PROGRAM_ID
        );

        const ix = createInitialiseUserAccountInstruction(
            {
                user,
                userAccount: pda,
                mainPool: MAIN_POOL,
            },
            PROGRAM_ID
        );

        return ix;
    }

    async fetchUserCommunityAccountIndex(
        user: PublicKey,
        userGlobalAccountPda: PublicKey,
        communityPool: PublicKey,
    ) {

        let index: number | null = null;
        let i = 0;

        while (index === null) {
            const [pda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
                    user.toBuffer(),
                    userGlobalAccountPda.toBuffer(),
                    (new BN(i)).toArrayLike(Buffer, "be", 4),
                ],
                PROGRAM_ID
            );

            try {
                const d = await UserCommunityAccount.fromAccountAddress(this.connection, pda);
                if (d.communityAddress.toString() === communityPool.toString()) {
                    index = i;
                } else {
                    i++;
                }
            } catch (err) {
                throw "User community account is not initialized."
            }
        }

        return i;
    }

    async initializeUserCommunityAccount(
        user: PublicKey,
        communityId: number,
    ) {
        const [userGlobalAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_ACCOUNT_SEED),
                user.toBuffer(),
                MAIN_POOL.toBuffer()
            ],
            PROGRAM_ID
        );

        const userGlobalAccountData = await UserAccount.fromAccountAddress(this.connection, userGlobalAccount);

        const [userCommunityAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
                user.toBuffer(),
                userGlobalAccount.toBuffer(),
                (new BN(userGlobalAccountData.communityCounter)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const [taken] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(MAIN_SEED),
                user.toBuffer(),
                communityPool.toBuffer(),
            ],
            PROGRAM_ID
        );

        const communityPoolData = await CommunityPool.fromAccountAddress(this.connection, communityPool);

        const [snapshotPeg] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(SNAPSHOT_PEG_SEED),
                communityPool.toBuffer(),
                new BN(communityPoolData.totalUsers).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const ix = createInitialiseUserCommunityAccountInstruction(
            {
                user,
                communityPool,
                mainPool: MAIN_POOL,
                userAccount: userGlobalAccount,
                userCommunityAccount: userCommunityAccount,
                taken,
                snapshotPeg,
            },
            {
                communityIdx: communityId
            },
            PROGRAM_ID
        );

        return ix;
    }

    async stakeNft(
        user: PublicKey,
        nft: PublicKey,
        communityId: number,
        collectionId: number,
        policyId: number
    ) {
        const [userGlobalAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_ACCOUNT_SEED),
                user.toBuffer(),
                MAIN_POOL.toBuffer()
            ],
            PROGRAM_ID
        );

        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const userCommunityAccountIndex = await this.fetchUserCommunityAccountIndex(user, userGlobalAccount, communityPool);
        const [userCommunityAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
                user.toBuffer(),
                userGlobalAccount.toBuffer(),
                (new BN(userCommunityAccountIndex)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const userAta = getAssociatedTokenAddressSync(
            nft,
            user,
        );

        const [nftTicket] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(NFT_TICKET),
                userGlobalAccount.toBuffer(),
                userCommunityAccount.toBuffer(),
                nft.toBuffer()
            ],
            PROGRAM_ID
        );

        const nftMetadataPda = this.metaplex.nfts().pdas().metadata({ mint: nft });

        const [collectionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_SEED),
                communityPool.toBuffer(),
                new BN(collectionId).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const [collectionPolicyPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_POLICY_SEED),
                collectionPda.toBuffer(),
                communityPool.toBuffer(),
                (new BN(policyId)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const edition = this.metaplex.nfts().pdas().edition({
            mint: nft
        });

        const ix = createStakeNftInstruction(
            {
                user,
                mainPool: MAIN_POOL,
                userAccount: userGlobalAccount,
                communityPool,
                userCommunityAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenMetadataProgram,
                userNftTokenAccount: userAta,
                collection: collectionPda,
                nftMint: nft,
                collectionPolicy: collectionPolicyPda,
                editionId: edition,
                nftTicket: nftTicket,
                mintMetadata: nftMetadataPda,
                masterMintMetadata: nftMetadataPda,
            },
            {
                communityAccount: userCommunityAccountIndex,
                collectionIdx: collectionId,
                policyIdx: policyId,
                communityIdx: communityId
            },
            PROGRAM_ID
        );

        return ix;
    }

    async unstakeNft(
        user: PublicKey,
        nft: PublicKey,
        communityId: number,
        collectionId: number,
        policyId: number
    ) {
        const [userGlobalAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_ACCOUNT_SEED),
                user.toBuffer(),
                MAIN_POOL.toBuffer()
            ],
            PROGRAM_ID
        );

        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const communityPoolData = await CommunityPool.fromAccountAddress(this.connection, communityPool);
        const token = communityPoolData.coinMint;

        const userCommunityAccountIndex = await this.fetchUserCommunityAccountIndex(user, userGlobalAccount, communityPool);
        const [userCommunityAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
                user.toBuffer(),
                userGlobalAccount.toBuffer(),
                (new BN(userCommunityAccountIndex)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const userAta = getAssociatedTokenAddressSync(
            nft,
            user,
        );

        const [nftTicket] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(NFT_TICKET),
                userGlobalAccount.toBuffer(),
                userCommunityAccount.toBuffer(),
                nft.toBuffer()
            ],
            PROGRAM_ID
        );

        const nftMetadataPda = this.metaplex.nfts().pdas().metadata({ mint: nft });

        const [collectionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_SEED),
                communityPool.toBuffer(),
                new BN(collectionId).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const [collectionPolicyPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_POLICY_SEED),
                collectionPda.toBuffer(),
                communityPool.toBuffer(),
                (new BN(policyId)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const edition = this.metaplex.nfts().pdas().edition({
            mint: nft
        });

        const rewardVault = getAssociatedTokenAddressSync(
            token,
            communityPool,
            true
        );

        const userRewardVault = getAssociatedTokenAddressSync(
            token,
            user,
            true
        );

        const ix = createUnstakeNftInstruction(
            {
                user,
                communityPool,
                mainPool: MAIN_POOL,
                unstakeNftTicket: nftTicket,
                mintMetadata: nftMetadataPda,
                nftMint: nft,
                collectionPolicy: collectionPolicyPda,
                editionId: edition,
                tokenMetadataProgram,
                userCommunityAccount: userCommunityAccount,
                masterMintMetadata: nftMetadataPda,
                userNftTokenAccount: userAta,
                collection: collectionPda,
                rewardVault: rewardVault,
                userRewardAccount: userRewardVault,
                userAccount: userGlobalAccount
            },
            {
                collectionIdx: collectionId,
                communityIdx: communityId,
                policyIdx: policyId,
                communityAccount: userCommunityAccountIndex
            },
            PROGRAM_ID
        );

        return ix;
    }

    async claimRewards(
        user: PublicKey,
        nft: PublicKey,
        communityId: number,
        collectionId: number,
        policyId: number,
    ) {
        const [communityPool] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COMMUNITY_SEED),
                MAIN_POOL.toBuffer(),
                (new BN(communityId)).toArrayLike(Buffer, "be", 4)
            ],
            PROGRAM_ID
        );

        const communityPoolData = await CommunityPool.fromAccountAddress(this.connection, communityPool);
        const token = communityPoolData.coinMint;

        const [userGlobalAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_ACCOUNT_SEED),
                user.toBuffer(),
                MAIN_POOL.toBuffer()
            ],
            PROGRAM_ID
        );

        const userCommunityAccountIndex = await this.fetchUserCommunityAccountIndex(user, userGlobalAccount, communityPool);
        const [userCommunityAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(USER_COMMUNITY_ACCOUNT_SEED),
                user.toBuffer(),
                userGlobalAccount.toBuffer(),
                (new BN(userCommunityAccountIndex)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const rewardVault = getAssociatedTokenAddressSync(
            token,
            communityPool,
            true
        );

        const userRewardVault = getAssociatedTokenAddressSync(
            token,
            user,
            true
        );

        const [collectionPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_SEED),
                communityPool.toBuffer(),
                new BN(collectionId).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const [nftTicket] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(NFT_TICKET),
                userGlobalAccount.toBuffer(),
                userCommunityAccount.toBuffer(),
                nft.toBuffer()
            ],
            PROGRAM_ID
        );

        const [collectionPolicyPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from(COLLECTION_POLICY_SEED),
                collectionPda.toBuffer(),
                communityPool.toBuffer(),
                (new BN(policyId)).toArrayLike(Buffer, "be", 4),
            ],
            PROGRAM_ID
        );

        const ix = createClaimSingleInstruction(
            {
                mainPool: MAIN_POOL,
                user,
                communityPool,
                userAccount: userGlobalAccount,
                userCommunityAccount: userCommunityAccount,
                rewardVault: rewardVault,
                userRewardAccount: userRewardVault,
                collectionPolicy: collectionPolicyPda,
                collection: collectionPda,
                nftTicket: nftTicket,
            },
            {
                nftMint: nft,
                communityIdx: communityId,
                collectionIdx: collectionId,
                collectionPolicyIdx: policyId,
                userCommunityAccountIdx: userCommunityAccountIndex
            },
            PROGRAM_ID
        );

        return ix;
    }
}

export default Emerald;