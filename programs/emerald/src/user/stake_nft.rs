use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Approve, Token, TokenAccount };
use mpl_token_metadata::instruction::freeze_delegated_account;
use solana_program::program::invoke_signed;

use crate::states::*;
use crate::constants::*;
use crate::errors::*;

pub fn stake_nft<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, StakeNftToPool<'info>>,
    community_idx: u32
) -> Result<()> {
    let collection: &mut Account<'_, Collection> = &mut ctx.accounts.collection;
    let collection_policy: &mut Account<'_, CollectionPolicy> = &mut ctx.accounts.collection_policy;
    let mint_metadata: &mut &AccountInfo<'_> = &mut &ctx.accounts.mint_metadata;
    let master_mint_metadata: &mut &AccountInfo<'_> = &mut &ctx.accounts.master_mint_metadata;
    let community_pool: &mut Box<Account<'_, CommunityPool>> = &mut ctx.accounts.community_pool;
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let nft_ticket: &mut Box<Account<'_, NftTicket>> = &mut ctx.accounts.nft_ticket;
    let user_account: &mut Box<Account<'_, UserAccount>> = &mut ctx.accounts.user_account;
    let user_community_account: &mut Box<
        Account<'_, UserCommunityAccount>
    > = &mut ctx.accounts.user_community_account;
    let nft_mint: &mut AccountInfo<'_> = &mut ctx.accounts.nft_mint;
    let metadata_program: &AccountInfo<'_> = &ctx.accounts.token_metadata_program;
    let edition_info: &AccountInfo<'_> = &ctx.accounts.edition_id;

    // Check NFT details against provided collection PDA
    collection.collection_member(mint_metadata, master_mint_metadata, &nft_mint.key())?;

    // Delegate as owner authority to the community pool PDA
    let cpi_accounts: Approve<'_> = Approve {
        to: ctx.accounts.user_nft_token_account.to_account_info(),
        delegate: community_pool.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program: AccountInfo<'_> = ctx.accounts.token_program.to_account_info();
    let cpi_context: CpiContext<'_, '_, '_, '_, Approve<'_>> = CpiContext::new(
        cpi_program,
        cpi_accounts
    );
    token::approve(cpi_context, 1)?;

    // Recalculate bump for signing
    let (_, rederived_bump) = anchor_lang::prelude::Pubkey::find_program_address(
        &[COMMUNITY_SEED.as_bytes(), main_pool.key().as_ref(), &community_idx.to_be_bytes()],
        &ctx.program_id
    );

    let main_pool_key: Pubkey = main_pool.key();

    // Seeds for freezing
    let seeds = &[
        COMMUNITY_SEED.as_bytes(),
        main_pool_key.as_ref(),
        &community_idx.to_be_bytes(),
        &[rederived_bump],
    ];

    msg!("edition_info.key(): {:?}", edition_info.key());

    // Get users NFT amount
    let current_nft_balance = ctx.accounts.user_nft_token_account.amount as f64;
    let sub_owner = ctx.accounts.user_nft_token_account.owner;

    msg!("currentNftBalance {:?} owned by {:?}", current_nft_balance, sub_owner);
    msg!("user calling {:?}", ctx.accounts.user.key());

    // Freeze delegated account
    invoke_signed(
        &freeze_delegated_account(
            *metadata_program.key,
            community_pool.key(),
            ctx.accounts.user_nft_token_account.key(),
            *edition_info.key,
            nft_mint.key()
        ),
        &[
            community_pool.to_account_info().clone(),
            ctx.accounts.user_nft_token_account.to_account_info(),
            edition_info.to_account_info(),
            nft_mint.to_account_info(),
        ],
        &[seeds]
    )?;

    // Set stake time and payout rate
    msg!("Settign NFT details ");
    nft_ticket.stake_time = Clock::get().unwrap().unix_timestamp;
    require!(
        collection_policy.within_time_cap(nft_ticket.stake_time),
        StakingError::TimeCapExceeded
    );

    // So that the first clai is not from the 1970s
    nft_ticket.claimed_time = nft_ticket.stake_time;
    nft_ticket.mint = nft_mint.key();

    // Set address of the policy
    nft_ticket.policy = collection_policy.key();

    // Increment staked NFTs per community and per collection
    community_pool.total_staked_count += 1;
    collection.total_staked += 1;

    msg!("collection.total_staked: in stake : {:?}", collection.total_staked);
    // Increment user active stakings counters
    user_community_account.stake_counter += 1;
    user_account.total_staked += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(community_idx: u32, collection_idx: u32, community_account: u32, policy_idx: u32)]
pub struct StakeNftToPool<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(mut,
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &community_pool.key().as_ref(),
            &collection_idx.to_be_bytes(),
        ],
        bump
    )]
    pub collection: Account<'info, Collection>,

    #[account(
        seeds = [
            COLLECTION_POLICY_SEED.as_bytes(),
            &collection.key().as_ref(),
            &community_pool.key().as_ref(),
            &policy_idx.to_be_bytes(),
        ],
        bump
    )]
    pub collection_policy: Box<Account<'info, CollectionPolicy>>,

    #[account(
        mut,
        seeds = [
            COMMUNITY_SEED.as_ref(), 
            &main_pool.key().as_ref(),
            &community_idx.to_be_bytes()],
        bump,
    )]
    pub community_pool: Box<Account<'info, CommunityPool>>,

    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED.as_bytes(), &user.key().as_ref(), &main_pool.key().as_ref()],
        bump
    )]
    pub user_account: Box<Account<'info, UserAccount>>,

    // Derived from user account counter
    #[account(
        init,
        seeds = [
            NFT_TICKET.as_bytes(),
            &user_account.key().as_ref(),
            &user_community_account.key().as_ref(),
            &nft_mint.key().as_ref(),
        ],
        bump,
        space = 8 + 80, // change
        payer = user
    )]
    pub nft_ticket: Box<Account<'info, NftTicket>>,

    #[account(
        mut,
        constraint = user_community_account.community_address == community_pool.key() @StakingError::CommunityMismatch,
        seeds = [
            USER_COMMUNITY_ACCOUNT_SEED.as_bytes(),
            &user.key().as_ref(),
            &user_account.key().as_ref(),
            &community_account.to_be_bytes(), //Provided by the user
        ],
        bump
    )]
    pub user_community_account: Box<Account<'info, UserCommunityAccount>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        mut,
        constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    pub mint_metadata: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        mut,
        // constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    pub master_mint_metadata: AccountInfo<'info>,

    #[account(
        mut,
        constraint = user_nft_token_account.mint == nft_mint.key(),
        constraint = user_nft_token_account.owner == *user.key,
        constraint = user_nft_token_account.amount == 1,
    )]
    pub user_nft_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub nft_mint: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(constraint = token_metadata_program.key == &metaplex_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub edition_id: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}
