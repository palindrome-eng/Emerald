use anchor_lang::prelude::*;
use crate::states::*;
use crate::errors::*;
use crate::constants::*;

pub fn withdraw_main(ctx: Context<WithdrawMain>) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let super_admin: &mut Signer<'_> = &mut ctx.accounts.super_admin;

    require!(super_admin.key() == main_pool.super_admin, StakingError::IncorrectSuperAdmin);

    let balance: u64 = main_pool.to_account_info().lamports();
    let data_len: usize = main_pool.to_account_info().data_len();

    let min_rent = Rent::minimum_balance(&Rent::default(), data_len);
    msg!("balance: {:?}", balance);
    msg!("data_len: {:?}", data_len);
    msg!("min_rent: {:?}", min_rent);
    let amount: u64 = balance - min_rent;
    msg!("amount: {:?}", amount);

    **main_pool.to_account_info().try_borrow_mut_lamports()? -= amount;
    **super_admin.to_account_info().try_borrow_mut_lamports()? += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawMain<'info> {
    #[account(mut, constraint = main_pool.super_admin == super_admin.key())]
    pub super_admin: Signer<'info>,
    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump )]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
