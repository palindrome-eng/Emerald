use anchor_lang::prelude::*;

pub mod errors;
pub mod states;
pub mod common;
pub mod superadmin;
pub mod admin;
pub mod user;

pub use errors::*;
pub use superadmin::*;
pub use admin::*;
pub use user::*;
pub use states::*;
pub use common::*;

declare_id!("FBjWvTHDWRKmezWPu1KCmmHZZiknntJKAiRZ6kNBUHfA");

#[program]
pub mod emerald {
    use super::*;

    pub fn initialise_main(
        ctx: Context<InitialiseMain>,
        user_community_account_creation_fee: u64,
        community_creation_fee: u64,
        collection_addition_fee: u64,
        collection_policy_addition_fee: u64,
        unstake_fee: u64
    ) -> Result<()> {
        initialise_main::initialise_main(
            ctx,
            user_community_account_creation_fee,
            community_creation_fee,
            collection_addition_fee,
            collection_policy_addition_fee,
            unstake_fee
        )
    }

    pub fn update_fees(
        ctx: Context<UpdateFees>,
        user_community_account_creation_fee: u64,
        community_creation_fee: u64,
        collection_addition_fee: u64,
        collection_policy_addition_fee: u64,
        unstake_fee: u64
    ) -> Result<()> {
        update_fees::update_fees(
            ctx,
            user_community_account_creation_fee,
            community_creation_fee,
            collection_addition_fee,
            collection_policy_addition_fee,
            unstake_fee
        )
    }

    pub fn initialise_community(
        ctx: Context<InitialiseCommunity>,
        fee_reduction: u8
    ) -> Result<()> {
        initialise_community::initialise_community(ctx, fee_reduction)
    }

    pub fn add_collection(
        ctx: Context<AddCollection>,
        _community_idx: u32,
        master_collection_key: Pubkey,
        master_edition_key: Pubkey,
        creator_key: Pubkey,
        verified_creator: bool // If false will not check verified creator
    ) -> Result<()> {
        add_collection::add_collection(
            ctx,
            _community_idx,
            master_collection_key,
            master_edition_key,
            creator_key,
            verified_creator
        )
    }

    pub fn add_collection_policy(
        ctx: Context<AddCollectionPolicy>,
        _community_idx: u32,
        _collection_idx: u32,
        rate: u64,
        epoch: i64,
        minimum_stake_time: i64,
        interaction_frequency: i64,
        attenuation: u32,
        permanent_policy: bool,
        time_capped: i64
    ) -> Result<()> {
        add_collection_policy::add_collection_policy(
            ctx,
            rate,
            epoch,
            minimum_stake_time,
            interaction_frequency,
            attenuation,
            permanent_policy,
            time_capped
        )
    }

    // Write call to update collection policy based on above call
    pub fn update_collection_policy(
        ctx: Context<UpdateCollectionPolicy>,
        _community_idx: u32,
        _collection_idx: u32,
        _collection_policy_idx: u32,
        rate: u64,
        epoch: i64,
        minimum_stake_time: i64,
        interaction_frequency: i64,
        attenuation: u32,
        permanent_policy: bool,
        time_capped: i64
    ) -> Result<()> {
        update_collection_policy::update_collection_policy(
            ctx,
            rate,
            epoch,
            minimum_stake_time,
            interaction_frequency,
            attenuation,
            permanent_policy,
            time_capped
        )
    }

    pub fn initialise_user_account(ctx: Context<InitialiseUserAccount>) -> Result<()> {
        initialise_user_account::initialise_user_account(ctx)
    }

    pub fn initialise_user_community_account(
        ctx: Context<InitialiseUserCommunityAccount>,
        _community_idx: u32
    ) -> Result<()> {
        initialise_user_community_account::initialise_user_community_account(ctx)
    }

    pub fn stake_nft<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, StakeNftToPool<'info>>,
        community_idx: u32,
        _collection_idx: u32,
        _community_account: u32,
        _policy_idx: u32
    ) -> Result<()> {
        stake_nft::stake_nft(ctx, community_idx)
    }

    pub fn unstake_nft<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UnstakeNftToPool<'info>>,
        community_idx: u32,
        _collection_idx: u32,
        _community_account: u32,
        _policy_idx: u32
    ) -> Result<()> {
        unstake_nft::unstake_nft(ctx, community_idx)
    }

    pub fn claim_single<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ClaimOne<'info>>,
        community_idx: u32,
        _collection_idx: u32,
        _collection_policy_idx: u32,
        _user_community_account_idx: u32,
        _nft_mint: Pubkey
    ) -> Result<()> {
        claim_single::claim(ctx, community_idx)
    }

    pub fn update_delegate<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateDelegate<'info>>,
        delegate: Pubkey
    ) -> Result<()> {
        update_delegate::update_delegate(ctx, delegate)
    }

    pub fn claim_delegate<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ClaimDelegate<'info>>,
        community_idx: u32,
        _collection_idx: u32,
        _collection_policy_idx: u32,
        _user_community_account_idx: u32,
        _nft_mint: Pubkey,
        _owner: Pubkey
    ) -> Result<()> {
        claim_delegate::claim_delegate(ctx, community_idx)
    }

    pub fn withdraw_community(
        ctx: Context<WithdrawCommunity>,
        community_idx: u32,
        withdraw_amount: u64
    ) -> Result<()> {
        withdraw_community::withdraw_community(ctx, community_idx, withdraw_amount)
    }

    pub fn lock_community(ctx: Context<LockCommunity>, community_idx: u32) -> Result<()> {
        lock_community::lock_community(ctx, community_idx)
    }

    pub fn withdraw_main(ctx: Context<WithdrawMain>) -> Result<()> {
        withdraw_main::withdraw_main(ctx)
    }
    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
        update_admin::update_admin(ctx, new_admin)
    }
}
