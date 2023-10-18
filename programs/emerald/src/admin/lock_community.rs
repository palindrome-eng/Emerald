use anchor_lang::prelude::*;
use anchor_spl::token::{ self, TokenAccount };

use crate::states::*;
use crate::constants::*;

pub fn lock_community(ctx: Context<LockCommunity>, _community_idx: u32) -> Result<()> {
    let community_pool: &mut Account<'_, CommunityPool> = &mut ctx.accounts.community_pool;

    // Lock her up
    community_pool.locked = true;

    // Set balance
    community_pool.locked_balance = ctx.accounts.reward_vault.amount;

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32)]
pub struct LockCommunity<'info> {
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
        constraint = reward_vault.mint == community_pool.coin_mint.key(),
        constraint = reward_vault.owner == community_pool.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
}
