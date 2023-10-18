use anchor_lang::prelude::*;
use crate::states::*;
use crate::errors::*;
use crate::constants::*;

pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let super_admin: &mut Signer<'_> = &mut ctx.accounts.super_admin;

    require!(super_admin.key() == main_pool.super_admin, StakingError::IncorrectSuperAdmin);

    main_pool.super_admin = new_admin.key();
    Ok(())
}
#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut, constraint = main_pool.super_admin == super_admin.key())]
    pub super_admin: Signer<'info>,
    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
