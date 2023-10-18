use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;
use crate::take_fee;

pub fn update_delegate(ctx: Context<UpdateDelegate>, delegate: Pubkey) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let delegate_pda: &mut Account<'_, Delegate> = &mut ctx.accounts.delegate_pda;
    delegate_pda.delegate = delegate;

    // Take 200% SOL of the price of creating a community account. But only happens once per claiminbg account.
    take_fee(
        &main_pool.to_account_info(),
        &ctx.accounts.user,
        ((main_pool.user_community_account_creation_fee as f64) * 2.0) as u64,
        0
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateDelegate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED.as_bytes(), &user.key().as_ref(), &main_pool.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init_if_needed,
        seeds = [DELEGATE_SEED.as_bytes(), &user_account.key().as_ref()],
        bump,
        space = 8 + 40, // change
        payer = user
    )]
    pub delegate_pda: Account<'info, Delegate>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
