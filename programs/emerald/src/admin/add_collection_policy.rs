use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;
use crate::errors::*;
use crate::utils::*;

// TODO make it time limited

pub fn add_collection_policy(
    ctx: Context<AddCollectionPolicy>,
    rate: u64, // In base coin
    epoch: i64, // In seconds
    minimum_stake_time: i64, // In seconds
    interaction_frequency: i64, // In seconds
    attenuation: u32, // As a percentage multiplier, accurate to one decimal place so XX.X%
    permanent_policy: bool, // Policy details are eternal
    time_capped: i64
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let collection: &mut Account<'_, Collection> = &mut ctx.accounts.collection;
    let collection_policy: &mut Account<'_, CollectionPolicy> = &mut ctx.accounts.collection_policy;
    let community_pool: &mut Account<'_, CommunityPool> = &mut ctx.accounts.community_pool;

    require!(epoch > 0, StakingError::ZeroValueEpoch);
    require!(rate > 0, StakingError::ZeroValueRate);

    // Take SOL fee for adding collection policy
    take_fee(
        &main_pool.to_account_info(),
        &ctx.accounts.admin,
        main_pool.collection_policy_addition_fee,
        community_pool.fee_reduction
    )?;

    // Set collection policy details
    collection_policy.rate = rate;
    collection_policy.epoch = epoch;
    collection_policy.minimum_stake_time = minimum_stake_time;

    collection_policy.interaction_frequency = interaction_frequency;
    collection_policy.attenuation = attenuation;
    collection_policy.permanent_policy = permanent_policy;
    collection_policy.time_capped = time_capped;

    // Increment total policies under that collection
    collection.total_policies += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32, collection_idx: u32)]
pub struct AddCollectionPolicy<'info> {
    #[account(mut, constraint = community_pool.community_admin == admin.key())]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [
            COMMUNITY_SEED.as_bytes(),
            &main_pool.key().as_ref(),
            &community_idx.to_be_bytes(),
        ],
        bump
    )]
    pub community_pool: Account<'info, CommunityPool>,

    #[account(
        mut,
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &community_pool.key().as_ref(),
            &collection_idx.to_be_bytes(),
        ],
        bump
    )]
    pub collection: Account<'info, Collection>,

    #[account(
        init,
        seeds = [
            COLLECTION_POLICY_SEED.as_bytes(),
            &collection.key().as_ref(),
            &community_pool.key().as_ref(),
            &collection.total_policies.to_be_bytes(),
        ],
        bump,
        space = 8 + 130,
        payer = admin
    )]
    pub collection_policy: Account<'info, CollectionPolicy>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
