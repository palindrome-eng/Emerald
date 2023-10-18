use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;

pub fn initialise_user_account(ctx: Context<InitialiseUserAccount>) -> Result<()> {
    ctx.accounts.main_pool.total_users += 1; // Increment total users
    Ok(())
}

#[derive(Accounts)]
pub struct InitialiseUserAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(
        init, // may need to remove this as calling again would reset values
        seeds = [USER_ACCOUNT_SEED.as_bytes(), &user.key().as_ref(), &main_pool.key().as_ref()],
        bump,
        space = 8 + 22, // change
        payer = user
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
