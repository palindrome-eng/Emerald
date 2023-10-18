use anchor_lang::prelude::*;
use crate::states::*;
use crate::constants::*;
use crate::utils::*;

pub fn initialise_user_community_account(
    ctx: Context<InitialiseUserCommunityAccount>
) -> Result<()> {
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let community_pool: &mut Box<Account<'_, CommunityPool>> = &mut ctx.accounts.community_pool;
    let user_community_account: &mut Box<
        Account<'_, UserCommunityAccount>
    > = &mut ctx.accounts.user_community_account;
    let snapshot_peg: &mut Account<'_, SnapshotPeg> = &mut ctx.accounts.snapshot_peg;

    // Take fee for creation of user community account
    take_fee(
        &main_pool.to_account_info(),
        &ctx.accounts.user,
        main_pool.user_community_account_creation_fee,
        community_pool.fee_reduction
    )?;

    // Incremente user total communitu membership count
    ctx.accounts.user_account.community_counter += 1;

    // Set community pool pointer in the user community account
    user_community_account.community_address = community_pool.key();

    // Increase total users per that community
    community_pool.total_users += 1;

    // Set pointer to a given users community details in the snapshot peg
    snapshot_peg.user_community_account = user_community_account.key();
    snapshot_peg.user_key = ctx.accounts.user.key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32)]
pub struct InitialiseUserCommunityAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(
        mut, 
        seeds = [
            COMMUNITY_SEED.as_bytes(),
            &main_pool.key().as_ref(),
            &community_idx.to_be_bytes(),
        ],
        bump,        
    )]
    pub community_pool: Box<Account<'info, CommunityPool>>,

    #[account(
        init,
        seeds = [MAIN_SEED.as_bytes(), &user.key().as_ref(), &community_pool.key().as_ref()],
        bump,
        space = 8 + 15, // change
        payer = user
    )]
    pub taken: Account<'info, Taken>,

    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED.as_bytes(), &user.key().as_ref(),  &main_pool.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init, // may need to remove this as calling again would reset values
        seeds = [
            USER_COMMUNITY_ACCOUNT_SEED.as_bytes(),
            &user.key().as_ref(),
            &user_account.key().as_ref(),
            &user_account.community_counter.to_be_bytes(),
        ],
        bump,
        space = 8 + 50, // change
        payer = user
    )]
    pub user_community_account: Box<Account<'info, UserCommunityAccount>>,

    // Add pointer for snapshot
    #[account(
        init,
        seeds = [
            SNAPSHOT_PEG_SEED.as_bytes(),
            &community_pool.key().as_ref(),
            &community_pool.total_users.to_be_bytes(),
        ],
        bump,
        space = 8 + 100, // change
        payer = user
    )]
    pub snapshot_peg: Account<'info, SnapshotPeg>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
