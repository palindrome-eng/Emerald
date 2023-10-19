use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;
use crate::errors::*;
use crate::utils::*;

pub fn add_collection(
    ctx: Context<AddCollection>,
    _community_idx: u32,
    master_collection_key: Pubkey,
    master_edition_key: Pubkey,
    creator_key: Pubkey,
    verified_creator: bool // If false will not check verified creator
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let community_pool: &mut Account<'_, CommunityPool> = &mut ctx.accounts.community_pool;
    let collection: &mut Account<'_, Collection> = &mut ctx.accounts.collection;
    collection.verified_creator = verified_creator;

    // Sanity checks, is this generally correct?
    // require!(
    //     master_collection_key != master_edition_key && master_edition_key != creator_key,
    //     StakingError::IncorrectCollectionAddresses
    // );

    // Take SOL fee for adding collection
    take_fee(
        &main_pool.to_account_info(),
        &ctx.accounts.admin.to_account_info(),
        main_pool.collection_addition_fee,
        community_pool.fee_reduction
    )?;

    // Set collection details
    collection.master_collection_key = master_collection_key;
    collection.master_edition_key = master_edition_key;
    collection.creators_key = creator_key;

    // Increment total collections under that community
    community_pool.collections_idx += 1;

    msg!(
        "New collection idx {:?} for community {:?}",
        community_pool.collections_idx,
        community_pool.key()
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32)]
pub struct AddCollection<'info> {
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
        init,
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &community_pool.key().as_ref(),
            &community_pool.collections_idx.to_be_bytes(),
        ],
        bump,
        space = 8 + 130,
        payer = admin
    )]
    pub collection: Account<'info, Collection>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
