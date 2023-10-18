use anchor_lang::prelude::*;
use anchor_spl::token::{ TokenAccount, Mint };

use crate::states::*;
use crate::errors::*;
use crate::constants::*;
use crate::utils::*;

pub fn initialise_community(ctx: Context<InitialiseCommunity>, fee_reduction: u8) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let community_pool: &mut Account<'_, CommunityPool> = &mut ctx.accounts.community_pool;
    let reward_vault: &mut Box<Account<'_, TokenAccount>> = &mut ctx.accounts.reward_vault;
    let coin_mint: &mut Account<'_, Mint> = &mut ctx.accounts.coin_mint;

    // Assert correct
    require!(fee_reduction <= 100, StakingError::IncorrectFeeReduction);

    let fr;
    match ctx.accounts.admin.key() == main_pool.super_admin {
        true => {
            fr = fee_reduction;
        }
        false => {
            fr = 0;
        }
    }
    take_fee(
        &main_pool.to_account_info(),
        &ctx.accounts.admin.to_account_info(),
        main_pool.community_creation_fee,
        fr
    )?;

    community_pool.fee_reduction = fee_reduction;

    // Set the admin of the new pool
    community_pool.community_admin = ctx.accounts.admin.key();

    // Set coin mint address and decimals for payouts
    community_pool.coin_mint = coin_mint.key();

    // Ensure correct decimals for the
    require!(coin_mint.decimals <= 18, StakingError::IncorrectSPLDecimals);

    community_pool.coin_decimals = coin_mint.decimals;

    msg!("main_pool.total_communities: {:?}", main_pool.total_communities);

    // Increment total community counter
    main_pool.total_communities += 1;

    msg!("main_pool.total_communities: {:?}", main_pool.total_communities);

    Ok(())
}

#[derive(Accounts)]
pub struct InitialiseCommunity<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [
            COMMUNITY_SEED.as_bytes(),
            &main_pool.key().as_ref(),
            &main_pool.total_communities.to_be_bytes(),
        ],
        bump,
        space = 8 + 120, // TODO: Double check correct size
        payer = admin
    )]
    pub community_pool: Account<'info, CommunityPool>,

    #[account(
        mut,
        constraint = reward_vault.mint == coin_mint.key(),
        constraint = reward_vault.owner == community_pool.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    // Mint for staking rewards
    pub coin_mint: Account<'info, Mint>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
