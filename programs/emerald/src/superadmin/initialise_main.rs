use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;

// Provided in in SOL, not lamports
pub fn initialise_main(
    ctx: Context<InitialiseMain>,
    user_community_account_creation_fee: u64,
    community_creation_fee: u64,
    collection_addition_fee: u64,
    collection_policy_addition_fee: u64,
    unstake_fee: u64
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    main_pool.super_admin = ctx.accounts.super_admin.key();

    // Fees
    main_pool.user_community_account_creation_fee = user_community_account_creation_fee;
    main_pool.community_creation_fee = community_creation_fee;
    main_pool.collection_addition_fee = collection_addition_fee;
    main_pool.collection_policy_addition_fee = collection_policy_addition_fee;
    main_pool.unstake_fee = unstake_fee;
    Ok(())
}

#[derive(Accounts)]
pub struct InitialiseMain<'info> {
    #[account(mut)]
    pub super_admin: Signer<'info>,
    #[account(
        seeds = [MAIN_SEED.as_ref()],
        // init_if_needed,
        init,
        bump,
        space = 8 + 100, // TODO: Change sizes
        payer = super_admin
    )]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
