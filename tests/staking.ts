import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Emerald } from "../target/types/emerald";
import {
  METAPLEX,
  MAIN_SEED,
  LAMPORTS_PER_SOL,
  SNAPSHOT_PEG_SEED,
  DELEGATE_SEED,
  MINUTE,
  DAY,
  COMMUNITY_CREATION_FEE,
  COLLECTION_CREATION_FEE,
  UNSTAKE_FEE,
  COLLECTION_POLICY_CREATION_FEE,
  USER_COMMUNITY_ACCOUNT_CREATION_FEE,
} from "./consts";
import { PublicKey } from "@solana/web3.js";
import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import {
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "bn.js";
import { assert } from "chai";
import { delay, loadKeypairFromFile, secNow } from "./helper";

// Classes needed to provide non-zero arguments to program calls
import { NftMint1, NftMint0, CollectionsMaster } from "./derived_nfts";
import { UserCommunity, Users, User, StakedNft, Delegate } from "./user";
import { Main, Community, Collection, Policy } from "./main";

describe("Emerald staking", async () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  async function getTokenBalance(ata) {
    return Number((await getAccount(provider.connection, ata.address)).amount);
  }

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
  async function latestCommunity(mainPoolPdag: PublicKey) {
    let mainState = await stakingProgram.account.mainPool.fetch(mainPoolPdag);
    return parseInt(mainState.totalCommunities.toString());
  }

  const stakingProgram: anchor.Program<Emerald> = anchor.workspace
    .Emerald as Program<Emerald>;

  const superAdmin = loadKeypairFromFile("./master-keypair.json"); // Needed for SOL withdraw function
  // const superAdmin = anchor.web3.Keypair.generate();
  const superAdmin2 = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  const bondBuyer1 = anchor.web3.Keypair.generate();
  const bondBuyer2 = anchor.web3.Keypair.generate();
  const resaleBuyer1 = anchor.web3.Keypair.generate();
  const nftWallet = anchor.web3.Keypair.generate();
  const defaultDelegate = anchor.web3.Keypair.generate();

  // Stable coin mint
  let mintSC: PublicKey;
  const mintAuthSC = anchor.web3.Keypair.generate();
  const mintKeypairSC = anchor.web3.Keypair.generate();

  let metaplex;
  let baseCommunityIdx: number;

  let number_of_collections = 2;
  let nfts_per_collections = 20;
  let maxCommunities = 3;

  // To keep a track of relationships between different PDAs and values used to derive them
  let userz: Users;
  let main: Main;
  let cm: CollectionsMaster;

  // community 0
  let communityPool0Reward = 10000000000000000;

  before(async () => {
    //top up all accounts
    await Promise.all([
      topUp(bondBuyer1.publicKey),
      topUp(bondBuyer2.publicKey),
      topUp(mintAuthSC.publicKey),
      topUp(mintKeypairSC.publicKey),
      topUp(superAdmin.publicKey),
      topUp(nftWallet.publicKey),
      topUp(resaleBuyer1.publicKey),
      topUp(nftWallet.publicKey),
      topUp(payer.publicKey),
      topUp(defaultDelegate.publicKey),
    ]);

    // liquidity_token mint
    mintSC = await createMint(
      provider.connection,
      mintAuthSC,
      mintAuthSC.publicKey,
      mintAuthSC.publicKey,
      5
    );

    metaplex = new Metaplex(provider.connection);
    metaplex.use(keypairIdentity(nftWallet));

    let uri: string = "https://arweave.net/123";

    // Mint of 0
    cm = new CollectionsMaster(provider.connection, nftWallet, metaplex);

    for (let i = 0; i < number_of_collections; i++) {
      // Mint of 1 index 1
      await cm.initializeCollection(uri);

      // Mint whole collection
      await cm.collections[i].premintNFTs(nfts_per_collections);
    }

    console.log("colelction 0 nft size: ", cm.collections[0].nfts.length);
  });

  it("Initialise main pool", async () => {
    // TODOcheck if exists and only then init it
    // PDA of the main account
    let [mainPoolPda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from(MAIN_SEED)],
      stakingProgram.programId
    );
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log("balanceStartAdmin:Initialise main pool ", balanceStartAdmin);

    try {
      const tx2 = await stakingProgram.methods
        .initialiseMain(
          new BN(USER_COMMUNITY_ACCOUNT_CREATION_FEE),
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
    } catch (e) {
      console.log(e);
    }

    // Get latest community and initialise main reference object
    baseCommunityIdx = await latestCommunity(mainPoolPda);
    main = new Main(
      provider.connection,
      baseCommunityIdx,
      mainPoolPda,
      stakingProgram,
      superAdmin,
      payer
    );
    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log("balanceEndMain : Initalise main pool", balanceEndMain);
    // Set main and program ID
    userz = new Users(main.address, stakingProgram.programId);
  });

  it("Initialise user accounts", async () => {
    for (let u = 0; u < 3; u++) {
      // Create new user and top them up
      let usr: User = await userz.addUser();
      await topUp(usr.keypair.publicKey);

      console.log(
        `usr[${u}] ${
          usr.keypair.publicKey
        } has main account at ${usr.userMainAccount.toBase58()}`
      );

      await stakingProgram.methods
        .initialiseUserAccount()
        .accounts({
          user: usr.keypair.publicKey,
          mainPool: main.address,
          userAccount: usr.userMainAccount,
        })
        .signers([usr.keypair])
        .rpc();

      // Derive delegate account PDA
      // let [delegate_pda] = await PublicKey.findProgramAddress(
      //   [Buffer.from(DELEGATE_SEED), usr.userMainAccount.toBuffer()],
      //   stakingProgram.programId
      // );

      await usr.addDelegate(defaultDelegate.publicKey);

      // try {
      // Adds default deelegate
      await await stakingProgram.methods
        .updateDelegate(usr.delegate.delegatePublicKey)
        .accounts({
          user: usr.keypair.publicKey,
          userAccount: usr.userMainAccount,
          delegatePda: usr.delegate.address,
          mainPool: main.address,
        })
        .signers([usr.keypair])
        .rpc();
      // } catch (e) {
      //   console.log("add deelgat error:\n", e);
      // }
    }

    // Assert more total user accounts now
  });

  it("Initialise few communities", async () => {
    await delay(1);
    // console.log("\n\nbaseCommunityIdx init pool0 start: ", baseCommunityIdx);
    for (let c = 0; c < maxCommunities; c++) {
      // Add community to the main tree
      const community: Community = await main.addCommunity(
        mintSC,
        superAdmin,
        1
      );

      console.log(
        `Initialiased community ${
          community.index
        } at a PDA address: ${community.address.toString()}`
      );
      // Mint to the above account some tokens
      await mintTo(
        provider.connection,
        mintAuthSC,
        community.scMint,
        community.rewardVault,
        mintAuthSC,
        communityPool0Reward, // Start balance for that thing
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      await stakingProgram.methods
        .initialiseCommunity(0) //fee reduction of 0
        .accounts({
          admin: community.admin.publicKey,
          mainPool: main.address,
          communityPool: community.address,
          coinMint: mintSC,
          rewardVault: community.rewardVault,
        })
        .signers([community.admin])
        .rpc();
      //TODO
      // Assert state set to the min value
      // let state = await community.getState();
      // // const startBalance = parseInt(state.startingBalance.toString());

      // // assert.equal(communityPool0Reward, startBalance);

      let finalCommIndex = await latestCommunity(main.address);
      // console.log("\n\nbaseCommunityIdx init pool1 start: ", finalCommIndex);
    }
  });

  it("Initialise users comumunity accounts)", async () => {
    // Loop over users
    for (let u = 0; u < userz.users.length; u++) {
      let user: User = userz.users[u];
      console.log(`\nUser[${u}] ${user.keypair.publicKey.toBase58()}`);
      // Loop over communities
      for (let c = 0; c < main.communities.length; c++) {
        let community: Community = main.communities[c];

        // Add community account to user class
        await user.addCommunityAccount(community.address, community.index);
        let [taken] = await PublicKey.findProgramAddress(
          [
            Buffer.from(MAIN_SEED),
            user.keypair.publicKey.toBuffer(),
            community.address.toBuffer(),
          ],
          stakingProgram.programId
        );

        //

        let [snapshotPeg] = await PublicKey.findProgramAddress(
          [
            Buffer.from(SNAPSHOT_PEG_SEED),
            community.address.toBuffer(),
            new BN(community.totalUsers).toArrayLike(Buffer, "be", 4),
          ],
          stakingProgram.programId
        );

        // Increment toal users
        community.incTotalUsers();

        console.log(
          `\tFor community[${
            community.index
          }]:${community.address.toBase58()} adding user community account ${user.communityAccount[
            c
          ].userCommunityAddress.toBase58()} at user index ${
            user.communityAccount[c].index
          }`
        );

        // console.log(`community ${c}: ${community.address.toBase58()}`);
        const tx1 = await stakingProgram.methods
          .initialiseUserCommunityAccount(community.index)
          .accounts({
            user: user.keypair.publicKey,
            mainPool: main.address,
            communityPool: community.address,
            userAccount: user.userMainAccount,
            snapshotPeg: snapshotPeg,
            userCommunityAccount: user.communityAccount[c].userCommunityAddress,
            taken: taken,
          })
          .signers([user.keypair])
          .rpc();
      }
    }
  });

  it("Admin withdraws from the community reward vault", async () => {
    // Get community 0
    const community: Community = main.communities[0];

    const tx2 = await stakingProgram.methods
      .withdrawCommunity(community.index, new BN(66666))
      .accounts({
        admin: community.admin.publicKey,
        mainPool: main.address,
        communityPool: community.address,
        withdrawAccount: await community.getAdminAta(),
        rewardVault: community.rewardVault,
      })
      .signers([community.admin])
      .rpc();
    //TODO
    // Assert that the balance has been transfered
  });

  it("Admin locks community", async () => {
    // Get community 0
    const community: Community = main.communities[0];

    // Lock community from withdraws
    const tx2 = await stakingProgram.methods
      .lockCommunity(community.index)
      .accounts({
        admin: community.admin.publicKey,
        mainPool: main.address,
        communityPool: community.address,
        rewardVault: community.rewardVault,
      })
      .signers([community.admin])
      .rpc();

    //  Try to withdraw and catch failure
    let failedFlag = false;
    try {
      const tx2 = await stakingProgram.methods
        .withdrawCommunity(community.index, new BN(66666))
        .accounts({
          admin: community.admin.publicKey,
          mainPool: main.address,
          communityPool: community.address,
          withdrawAccount: await community.getAdminAta(),
          rewardVault: community.rewardVault,
        })
        .signers([community.admin])
        .rpc();
      failedFlag = true;
    } catch (e) {
      // console.log("Expected error: ", e);
    }

    assert.equal(failedFlag, false);
    let state = await community.getState();
    const startBalance = parseInt(state.lockedBalance.toString());
    console.log("Locked balance: ", startBalance);
    // assert.equal(communityPool0Reward, startBalance);

    // Ensure locked balance is shown
  });

  it("Add NFT collections", async () => {
    // Get base community and add collection
    console.log("Total communities: ", main.communities.length);

    // Loop over communities
    for (let com = 0; com < 2; com++) {
      let community: Community = main.communities[com];
      console.log(
        `\nFor community[${community.index}] at address ${community.address}`
      );

      // Create collections
      for (let col = 0; col < number_of_collections; col++) {
        let collection: Collection = await community.addCollection(
          cm.collections[col].masterMint,
          cm.collections[col].masterEdition,
          cm.collections[col].masterMetadata
        );
        console.log(
          `\tadding collection index ${collection.index} at address ${
            collection.address
          } for master edition ${collection.masterEdition.toBase58()}`
        );

        const tx2 = await stakingProgram.methods
          .addCollection(
            community.index,
            cm.collections[col].masterMint,
            cm.collections[col].masterEdition,
            nftWallet.publicKey,
            true
          )
          .accounts({
            admin: community.admin.publicKey,
            mainPool: main.address,
            communityPool: community.address,
            collection: collection.address,
          })
          .signers([community.admin])
          .rpc();
      }
    }

    // Assert that that counter for cm has incremented
    // let collectionsCounter = parseInt(
    //   (
    //     await stakingProgram.account.communityPool.fetch(communityPoolPda0)
    //   ).collectionsIdx.toString()
    // );
    // assert.equal(1, collectionsCounter);

    // Tests need to assert that:
    // - collection addition fee is taken
    // - can't feed same key for creator/edition/mint
    // - payout/epoch have to be non zero
  });

  it("Add collection policies", async () => {
    // Loop over communities
    for (let com = 0; com < 2; com++) {
      let community: Community = main.communities[com];

      console.log(`\nCommunity${community.index} at ${community.address}: `);

      // Loop over collection for that community
      for (let col = 0; col < community.collections.length; col++) {
        let collection: Collection = community.collections[col];
        const policy: Policy = await collection.addPolicy(
          0, // Minnimum stake period
          2000, //Epoch duration
          200, // Epoch rate
          0, // Offer period, cant stake with that policy afterwards
          2, // Need to claim every seconds
          1000 // Attenuation multiplier reward * XX.X% (1000 = 100%)
        );

        console.log(
          `\tadding ${collection.index} policy at ${policy.address.toBase58()}`
        );

        const tx2 = await stakingProgram.methods
          .addCollectionPolicy(
            community.index,
            collection.index,
            policy.rate,
            policy.epoch,
            policy.minStakePeriod, // Minnimum stake
            policy.interactionFrequency, // Penalty if not interacted every X seconds
            policy.attenuation, //  Penalty %
            false,
            new BN(0) // time cap
          )
          .accounts({
            admin: community.admin.publicKey,
            mainPool: main.address,
            communityPool: community.address,
            collectionPolicy: policy.address,
            collection: collection.address,
          })
          .signers([community.admin])
          .rpc();
      }
    }
  });

  it("Updates collection policy ", async () => {
    let community: Community = main.communities[0];
    let collection: Collection = community.collections[0];
    const policy: Policy = collection.policies[0];

    console.log(
      `\tadding ${collection.index} policy at ${policy.address.toBase58()}`
    );

    const tx2 = await stakingProgram.methods
      .updateCollectionPolicy(
        community.index,
        collection.index,
        policy.index,
        new BN(6666),
        policy.epoch,
        policy.minStakePeriod, // Minnimum stake
        policy.interactionFrequency, // Penalty if not interacted every X seconds
        policy.attenuation, //  Penalty %
        false,
        new BN(0)
      )
      .accounts({
        admin: community.admin.publicKey,
        mainPool: main.address,
        communityPool: community.address,
        collectionPolicy: policy.address,
        collection: collection.address,
      })
      .signers([community.admin])
      .rpc();
  });

  it("Superadmin withdraws SOL", async () => {
    let mainPoolBalance: number = await provider.connection.getBalance(
      main.address
    );
    console.log("mainPoolBalance in sol: ", mainPoolBalance / LAMPORTS_PER_SOL);
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log(
      "balanceStartAdmin in sol: ",
      balanceStartAdmin / LAMPORTS_PER_SOL
    );
    try {
      const tx2 = await stakingProgram.methods
        .withdrawMain()
        .accounts({
          superAdmin: superAdmin.publicKey,
          mainPool: main.address,
        })
        .signers([superAdmin])
        .rpc();
    } catch (e) {
      console.log(e);
    }
    let balanceEndAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );

    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log("mainPoolBalance in sol: ", balanceEndMain / LAMPORTS_PER_SOL);
    console.log("balanceEndAdmin in sol: ", balanceEndAdmin / LAMPORTS_PER_SOL);

    // assert.equal(balanceEndMain, 0);
    assert.isTrue(balanceStartAdmin < balanceEndAdmin);
  });

  it("Users stakes lots of NFTs", async () => {
    // For draining out of a given collection
    let nftsGone = 0;

    // Loop over all of the spawned users
    for (let user_idx = 0; user_idx < userz.users.length; user_idx++) {
      console.log(`\nuser[${user_idx}]`);
      let user: User = userz.users[user_idx];

      // Loop over all of the spawned collections
      for (let coll_idx = 0; coll_idx < cm.collections.length; coll_idx++) {
        // Handle for cm collection
        let collectionM: NftMint0 = cm.collections[coll_idx];
        let community: Community = main.communities[0];
        // Collection needs to be retreived from the community
        let collection: Collection = community.findCollection(
          collectionM.masterMint
        );

        console.log(
          "Collection master mint: ",
          collectionM.masterMint.toBase58()
        );

        let policy: Policy = collection.policies[0];

        console.log(
          `\tRemaining NFTs in this collection ${
            collectionM.nfts.length - nftsGone
          } out of  ${collectionM.nfts.length}`
        );
        for (let n = 0; n < 4; n += 1, nftsGone++) {
          // Break if it exceeds minted nfts

          if (nftsGone >= collectionM.nfts.length) {
            console.log(`inside breaking}`);
            break;
          }

          // Send from oroginal owner to user[n]
          await collectionM.nfts[nftsGone].transferFromMinter(
            user.keypair.publicKey
          );
          // console.log("After transmiting out as the mint master");

          let nft = collectionM.nfts[nftsGone];

          // console.log(
          //   `Transfered ${nft.mint.toBase58()} from mint master to ${user.keypair.publicKey.toBase58()}`
          // );

          // Update nfts owned by user1 (but zero here since JS arrays start at 0)
          user.addNft(collectionM.nfts[nftsGone].mint);

          // Need to find which of users accounts matches given raw community index
          const userCommunity: UserCommunity = user.getByCommunityIdx(
            community.index
          );

          // It will be staked so move it to the staked array for the given community PDA generated
          await userCommunity.stakeNft(
            nft.mint,
            collection.address,
            policy.address,
            collection.index,
            policy.index
          );

          console.log(
            `\tstaking   NFT, ${n} ${nft.mint.toBase58()} at ATA: ${(
              await collectionM.nfts[n].getAta(user.keypair.publicKey)
            ).toBase58()}`
          );

          const tx1 = await stakingProgram.methods
            .stakeNft(
              community.index,
              collection.index,
              userCommunity.index,
              policy.index
            )
            .accounts({
              mainPool: main.address,
              user: user.keypair.publicKey,
              userAccount: user.userMainAccount,
              userCommunityAccount: userCommunity.userCommunityAddress,
              communityPool: community.address,
              nftTicket: userCommunity.getByMint(nft.mint).ticketPda,
              nftMint: nft.mint,
              userNftTokenAccount: await nft.getAta(user.keypair.publicKey),
              collection: collection.address,
              collectionPolicy: policy.address,
              masterMintMetadata: nft.metadata,
              mintMetadata: nft.metadata,
              tokenMetadataProgram: METAPLEX,
              editionId: nft.edition,
            })
            .signers([user.keypair])
            .rpc();

          // Unstake
          await delay(2);

          // console.log(
          //   `\tunstaking NFT, ${n} ${nft.mint.toBase58()} at ATA: ${(
          //     await collectionM.nfts[n].getAta(user.keypair.publicKey)
          //   ).toBase58()}`
          // );

          // // try {
          // const tx2 = await stakingProgram.methods
          //   .unstakeNft(
          //     community.index,
          //     collection.index,
          //     userCommunity.index,
          //     policy.index
          //   )
          //   .accounts({
          //     mainPool: main.address,
          //     user: user.keypair.publicKey,
          //     userAccount: user.userMainAccount,
          //     userCommunityAccount: userCommunity.userCommunityAddress,
          //     communityPool: community.address,

          //     // NFT PDA information accounts
          //     unstakeNftTicket: userCommunity.getByMint(nft.mint).ticketPda,

          //     // ATA derived from the token being unfrozen
          //     userNftTokenAccount: await nft.getAta(user.keypair.publicKey),

          //     // NFT accounts
          //     nftMint: nft.mint,
          //     mintMetadata: nft.metadata,
          //     editionId: nft.edition,

          //     // Master NFT accounts (NOT NEEDED)
          //     collection: collection.address,
          //     collectionPolicy: policy.address,
          //     masterMintMetadata: nft.metadata,

          //     // Metaplex program
          //     tokenMetadataProgram: METAPLEX,

          //     // For payout
          //     rewardVault: main.comByChainIdx(community.index).rewardVault,
          //     userRewardAccount: await community.getScAta(
          //       user.keypair.publicKey
          //     ),
          //   })
          //   .signers([user.keypair])
          //   .rpc();
          // // } catch (e) {
          // //   console.log(e);
          // // }

          // await delay(1);

          // // try {
          // console.log(
          //   `\trestaking NFT, ${n} ${nft.mint.toBase58()} at ATA: ${(
          //     await collectionM.nfts[n].getAta(user.keypair.publicKey)
          //   ).toBase58()}`
          // );

          // const tx3 = await stakingProgram.methods
          //   .stakeNft(
          //     community.index,
          //     collection.index,
          //     userCommunity.index,
          //     policy.index
          //   )
          //   .accounts({
          //     mainPool: main.address,
          //     user: user.keypair.publicKey,
          //     userAccount: user.userMainAccount,
          //     userCommunityAccount: userCommunity.userCommunityAddress,
          //     communityPool: community.address,
          //     nftTicket: userCommunity.getByMint(nft.mint).ticketPda,
          //     nftMint: nft.mint,
          //     userNftTokenAccount: await nft.getAta(user.keypair.publicKey),
          //     collection: collection.address,
          //     collectionPolicy: policy.address,
          //     masterMintMetadata: nft.metadata,
          //     mintMetadata: nft.metadata,
          //     tokenMetadataProgram: METAPLEX,
          //     editionId: nft.edition,
          //   })
          //   .signers([user.keypair])
          //   .rpc();

          // Unstake then stake again
          // } catch (e) {
          //   console.log(e);
          // }

          collectionM.nfts[n].updateOwner(user.keypair.publicKey);
        }
      }
    }

    // Tests need to assert that:
    // - total NFT went up
    // - collection  NFT went up
    // - stake time is set
    // - payout rate is set
    // - user stake countr is incremenetd
    // - owner can't transfer NFT now elswhere
  });

  it("Users claim on few NFTs from base community using single claim", async () => {
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log("balanceStartAdmin: before user claiming ", balanceStartAdmin);
    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log("balanceEndMain before user claiming ", balanceEndMain);
    await delay(1);
    for (let user_idx = 0; user_idx < userz.users.length; user_idx++) {
      let user: User = userz.users[user_idx];
      let userStakedNtfs: StakedNft[] = user.getAllStakedNfts();
      console.log(
        `\nuser[${user_idx}] has ${userStakedNtfs.length} staked nfts`
      );

      for (let s = 0; s < userStakedNtfs.length; s++) {
        const sNft: StakedNft = userStakedNtfs[s];
        console.log(`\tClaims on NFT  ${sNft.mint}`);

        const userCommunity: UserCommunity = user.getByCommunityIdx(
          sNft.communityIdx
        );

        const community: Community = main.comByChainIdx(sNft.communityIdx);

        try {
          const tx2 = await stakingProgram.methods
            .claimSingle(
              sNft.communityIdx,
              sNft.collectionIdx,
              sNft.policyIdx,
              userCommunity.index,
              sNft.mint
            )
            .accounts({
              mainPool: main.address,
              user: user.keypair.publicKey,
              userAccount: user.userMainAccount,
              communityPool: sNft.communityAddress,
              userCommunityAccount: sNft.userCommunityAddress,
              nftTicket: sNft.ticketPda,

              // For payout
              rewardVault: main.comByChainIdx(sNft.communityIdx).rewardVault,
              userRewardAccount: await community.getScAta(
                user.keypair.publicKey
              ), //user0_ata.address,
              collection: sNft.collectionAddress,
              collectionPolicy: sNft.policyAddress,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user.keypair])
            .rpc();
        } catch (e) {
          console.log("\n\nclaim fail try:\ne", e);
        }

        // Log how long it was staked for
        let timeElapased = secNow() - sNft.stakeTime; //   addTimeSTamp(0, n, secNow());

        // Get community
        let collection: Collection = community.collections[sNft.collectionIdx];

        // Get collection
        const policy: Policy = collection.policies[sNft.policyIdx];

        let ratio = timeElapased / parseInt(policy.epoch.toString());
        console.log(
          `\tClaiming on NFT ${
            sNft.mint
          } which was staked for: ${timeElapased.toFixed(1)}s or ${(
            ratio * 100
          ).toFixed(1)}% of the epoch duration which should yield ${(
            parseInt(policy.rate.toString()) * ratio
          ).toFixed(1)}`
        );
      }
    }
  });

  it("User appointed delegate claims on few NFTs from base community using single claim", async () => {
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log("balanceStartAdmin: before user claiming ", balanceStartAdmin);
    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log("balanceEndMain before user claiming ", balanceEndMain);
    await delay(3);
    for (let user_idx = 0; user_idx < userz.users.length; user_idx++) {
      let user: User = userz.users[user_idx];
      let userStakedNtfs: StakedNft[] = user.getAllStakedNfts();
      console.log(
        `\nuser[${user_idx}] has ${userStakedNtfs.length} staked nfts`
      );

      for (let s = 0; s < userStakedNtfs.length; s++) {
        const sNft: StakedNft = userStakedNtfs[s];
        console.log(`\tDelegate claims on NFT  ${sNft.mint}`);

        const userCommunity: UserCommunity = user.getByCommunityIdx(
          sNft.communityIdx
        );

        const community: Community = main.comByChainIdx(sNft.communityIdx);
        const delegate: Delegate = user.delegate;

        try {
          const tx2 = await stakingProgram.methods
            .claimDelegate(
              sNft.communityIdx,
              sNft.collectionIdx,
              sNft.policyIdx,
              userCommunity.index,
              sNft.mint,
              user.keypair.publicKey
            )
            .accounts({
              mainPool: main.address,
              delegateCaller: delegate.delegatePublicKey,
              delegatePda: delegate.address,
              userAccount: user.userMainAccount,
              communityPool: sNft.communityAddress,
              userCommunityAccount: sNft.userCommunityAddress,
              nftTicket: sNft.ticketPda,
              rewardVault: main.comByChainIdx(sNft.communityIdx).rewardVault,
              userRewardAccount: await community.getScAta(
                user.keypair.publicKey
              ),
              collection: sNft.collectionAddress,
              collectionPolicy: sNft.policyAddress,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([defaultDelegate])
            .rpc();
        } catch (e) {
          console.log("\n\nclaim fail try:\ne", e);
        }

        // Log how long it was staked for
        let timeElapased = secNow() - sNft.stakeTime; //   addTimeSTamp(0, n, secNow());

        // Get community
        let collection: Collection = community.collections[sNft.collectionIdx];

        // Get collection
        const policy: Policy = collection.policies[sNft.policyIdx];

        let ratio = timeElapased / parseInt(policy.epoch.toString());
        console.log(
          `\tDelegate claiming on NFT ${
            sNft.mint
          } which was staked for: ${timeElapased.toFixed(1)}s or ${(
            ratio * 100
          ).toFixed(1)}% of the epoch duration which should yield ${(
            parseInt(policy.rate.toString()) * ratio
          ).toFixed(1)}`
        );
      }
    }
  });

  it("Users unstakes some of NFTs", async () => {
    // Wait for some tokens to accumulate
    await delay(5);

    try {
      for (let user_idx = 0; user_idx < userz.users.length; user_idx++) {
        let user: User = userz.users[user_idx];
        console.log(
          `\nuser[${user_idx}]: ${user.keypair.publicKey.toBase58()}`
        );
        let userStakedNtfs: StakedNft[] = user.getAllStakedNfts();

        for (let n = 0; n < userStakedNtfs.length; n += 1) {
          // Extarct single staked NFT details
          let sNFT = userStakedNtfs[n];
          const community: Community = main.comByChainIdx(sNFT.communityIdx);
          const collectionPDA: Collection =
            community.collections[sNFT.collectionIdx];
          const policy: Policy = collectionPDA.policies[sNFT.policyIdx];
          const userCommunity: UserCommunity = user.getByCommunityIdx(
            sNFT.communityIdx
          );

          // Get other nft details
          const collection: NftMint0 = cm.collections[sNFT.collectionIdx];
          const nftDeets: NftMint1 = cm.collections[
            sNFT.collectionIdx
          ].getNftByMint(sNFT.mint);

          const tx2 = await stakingProgram.methods
            .unstakeNft(
              sNFT.communityIdx,
              sNFT.collectionIdx,
              userCommunity.index,
              sNFT.policyIdx
            )
            .accounts({
              mainPool: main.address,
              user: user.keypair.publicKey,
              userAccount: user.userMainAccount,
              userCommunityAccount: sNFT.userCommunityAddress,
              communityPool: sNFT.communityAddress,

              // NFT PDA information accounts
              unstakeNftTicket: sNFT.ticketPda,

              // ATA derived from the token being unfrozen
              userNftTokenAccount: await cm.getAta(
                user.keypair.publicKey,
                nftDeets.mint
              ),

              // NFT accounts
              nftMint: nftDeets.mint,
              mintMetadata: nftDeets.metadata,
              editionId: nftDeets.edition,

              // Master NFT accounts (NOT NEEDED)
              collection: sNFT.collectionAddress,
              collectionPolicy: sNFT.policyAddress,
              masterMintMetadata: collection.masterMetadata,

              // Metaplex program
              tokenMetadataProgram: METAPLEX,

              // For payout
              rewardVault: main.comByChainIdx(sNFT.communityIdx).rewardVault,
              userRewardAccount: await community.getScAta(
                user.keypair.publicKey
              ),
            })
            .signers([user.keypair])
            .rpc();

          // Log how long it was staked for
          let timeElapased = secNow() - sNFT.stakeTime; //   addTimeSTamp(0, n, secNow());

          let ratio = timeElapased / parseInt(policy.epoch.toString());
          console.log(
            `\tUnstaked NFT ${
              sNFT.mint
            } which was staked for: ${timeElapased.toFixed(1)}s or ${(
              ratio * 100
            ).toFixed(1)}% of the epoch duration which should yield ${(
              parseInt(policy.rate.toString()) * ratio
            ).toFixed(1)}`
          );
        }
      }
    } catch (e) {
      console.log(e);
    }

    // Tests need to assert that:
    // - total NFT went down
    // - collection  NFT went down
    // - content of removeIdx = content of lastIdx
    // - lasdIdx account is removed
    // - owner can transfer NFT now elswhere
    // - unstake fee is taken
    // - owner has less staked NFTs
  });
  it("Change superadmin", async () => {
    // let newSuperAdmin = await newAccountWithLamports(provider.connection, 10000000000);
    // console.log("newSuperAdmin: ", newSuperAdmin.publicKey.toBase58());
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log(
      "balanceStartAdmin in sol: ",
      balanceStartAdmin / LAMPORTS_PER_SOL
    );

    try {
      const tx2 = await stakingProgram.methods
        .updateAdmin(superAdmin2.publicKey)
        .accounts({
          superAdmin: superAdmin.publicKey,
          mainPool: main.address,
        })
        .signers([superAdmin])
        .rpc();
    } catch (e) {
      console.log(e);
    }
  });
  it("Old superadmin cannot withdraw SOL", async () => {
    let mainPoolBalance: number = await provider.connection.getBalance(
      main.address
    );
    console.log("mainPoolBalance in sol: ", mainPoolBalance / LAMPORTS_PER_SOL);
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );
    console.log(
      " OldAdmin balanceStart in sol: ",
      balanceStartAdmin / LAMPORTS_PER_SOL
    );
    try {
      const tx2 = await stakingProgram.methods
        .withdrawMain()
        .accounts({
          superAdmin: superAdmin.publicKey,
          mainPool: main.address,
        })
        .signers([superAdmin])
        .rpc();
    } catch (e) {
      console.log("Withdraw failed succesfully");
    }
    let balanceEndAdmin: number = await provider.connection.getBalance(
      superAdmin.publicKey
    );

    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log(
      "mainPoolBalanceEnd in sol: ",
      balanceEndMain / LAMPORTS_PER_SOL
    );
    console.log(
      "OldAdmin balanceEnd in sol: ",
      balanceEndAdmin / LAMPORTS_PER_SOL
    );

    // assert.equal(balanceEndMain, 0);
    assert.isTrue(balanceStartAdmin == balanceEndAdmin);
  });
  it("New superadmin withdraws SOL", async () => {
    let mainPoolBalance: number = await provider.connection.getBalance(
      main.address
    );
    console.log("mainPoolBalance in sol: ", mainPoolBalance / LAMPORTS_PER_SOL);
    let balanceStartAdmin: number = await provider.connection.getBalance(
      superAdmin2.publicKey
    );
    console.log(
      "balanceStartAdmin in sol: ",
      balanceStartAdmin / LAMPORTS_PER_SOL
    );
    try {
      const tx2 = await stakingProgram.methods
        .withdrawMain()
        .accounts({
          superAdmin: superAdmin2.publicKey,
          mainPool: main.address,
        })
        .signers([superAdmin2])
        .rpc();
    } catch (e) {
      console.log(e);
    }
    let balanceEndAdmin: number = await provider.connection.getBalance(
      superAdmin2.publicKey
    );

    let balanceEndMain: number = await provider.connection.getBalance(
      main.address
    );
    console.log("mainPoolBalance in sol: ", balanceEndMain / LAMPORTS_PER_SOL);
    console.log("balanceEndAdmin in sol: ", balanceEndAdmin / LAMPORTS_PER_SOL);

    // assert.equal(balanceEndMain, 0);
    assert.isTrue(balanceStartAdmin < balanceEndAdmin);
  });
});
