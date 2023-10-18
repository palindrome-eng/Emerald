use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Token, TokenAccount, Transfer };

use crate::states::*;
use crate::constants::*;
use crate::errors::*;

pub fn withdraw_community(
    ctx: Context<WithdrawCommunity>,
    community_idx: u32,
    withdraw_amount: u64
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let community_pool: &mut Account<'_, CommunityPool> = &mut ctx.accounts.community_pool;
    let reward_vault: &mut Box<Account<'_, TokenAccount>> = &mut ctx.accounts.reward_vault;

    let mut withdraw = withdraw_amount;

    // Check that is not locked
    require!(!community_pool.locked, StakingError::CommunityLocked);

    // Check that it is the admin

    // Send earned tokens to users ATA
    if reward_vault.amount > 0 {
        // If less left than the staking reward, withdraw whatever is left
        if withdraw > reward_vault.amount {
            msg!("Reward is greater than vault amount, withdrawing vault amount");
            withdraw = reward_vault.amount;
        }

        // Recalculate bump
        let (_, rederived_bump) = anchor_lang::prelude::Pubkey::find_program_address(
            &[COMMUNITY_SEED.as_bytes(), main_pool.key().as_ref(), &community_idx.to_be_bytes()],
            &ctx.program_id
        );

        let main_pool_key: Pubkey = main_pool.key();
        // Seeds for signing
        let seeds = &[
            COMMUNITY_SEED.as_bytes(),
            main_pool_key.as_ref(),
            &community_idx.to_be_bytes(),
            &[rederived_bump],
        ];

        // Seeds for PDA transfer
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.withdraw_account.to_account_info(),
            authority: community_pool.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                cpi_accounts,
                signer
            ),
            withdraw
        )?;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32)]
pub struct WithdrawCommunity<'info> {
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

    #[account(
        mut,
        constraint = reward_vault.mint == community_pool.coin_mint.key(),        
    )]
    pub withdraw_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
    pub token_program: Program<'info, Token>,
}
