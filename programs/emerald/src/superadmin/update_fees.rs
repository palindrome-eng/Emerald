use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;

// Provided in in SOL, not lamports
pub fn update_fees(
    ctx: Context<UpdateFees>,
    user_community_account_creation_fee: u64,
    community_creation_fee: u64,
    collection_addition_fee: u64,
    collection_policy_addition_fee: u64,
    unstake_fee: u64
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    // Fees
    main_pool.user_community_account_creation_fee = user_community_account_creation_fee;
    main_pool.community_creation_fee = community_creation_fee;
    main_pool.collection_addition_fee = collection_addition_fee;
    main_pool.collection_policy_addition_fee = collection_policy_addition_fee;
    main_pool.unstake_fee = unstake_fee;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateFees<'info> {
    #[account(mut)]
    pub super_admin: Signer<'info>,
    #[account(        
        mut,
        seeds = [MAIN_SEED.as_ref()],        
        bump,     
        constraint = main_pool.super_admin == super_admin.key()   
    )]
    pub main_pool: Account<'info, MainPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
