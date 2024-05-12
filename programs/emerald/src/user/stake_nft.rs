use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Approve, Token, TokenAccount };
use mpl_token_metadata::instruction::freeze_delegated_account;
use solana_program::program::invoke_signed;

use crate::accounts;
use crate::states::*;
use crate::constants::*;
use crate::errors::*;

pub fn stake_nft<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, StakeNftToPool<'info>>,
    community_idx: u32
) -> Result<()> {
    let accounts: &mut StakeNftToPool<'info> = ctx.accounts;

    // Check NFT details against provided collection PDA
    accounts.collection.collection_member(
        &&accounts.mint_metadata,
        &&accounts.master_mint_metadata,
        &accounts.nft_mint.key()
    )?;

    // Recalculate bump for signing
    let (_, rederived_bump) = anchor_lang::prelude::Pubkey::find_program_address(
        &[
            COMMUNITY_SEED.as_bytes(),
            accounts.main_pool.key().as_ref(),
            &community_idx.to_be_bytes(),
        ],
        &ctx.program_id
    );

    msg!("edition_info.key(): {:?}", accounts.edition_id.key());

    // Deelgate the NFT to the community pool
    accounts.delegate(community_idx, rederived_bump)?;

    // Get users NFT amount
    let current_nft_balance: f64 = accounts.user_nft_token_account.amount as f64;
    let sub_owner: Pubkey = accounts.user_nft_token_account.owner;

    msg!("currentNftBalance {:?} owned by {:?}", current_nft_balance, sub_owner);
    msg!("user calling {:?}", accounts.user.key());

    // Set stake time and payout rate
    msg!("Settign NFT details ");
    accounts.nft_ticket.stake_time = Clock::get().unwrap().unix_timestamp;
    require!(
        accounts.collection_policy.within_time_cap(accounts.nft_ticket.stake_time),
        StakingError::TimeCapExceeded
    );

    // So that the first clai is not from the 1970s
    accounts.nft_ticket.claimed_time = accounts.nft_ticket.stake_time;
    accounts.nft_ticket.mint = accounts.nft_mint.key();

    // Set address of the policy
    accounts.nft_ticket.policy = accounts.collection_policy.key();

    // Increment staked NFTs per community and per collection
    accounts.community_pool.total_staked_count += 1;
    if community_idx != 0 {
        accounts.collection.total_staked += 1;
    }

    msg!("collection.total_staked: in stake : {:?}", accounts.collection.total_staked);
    // Increment user active stakings counters
    accounts.user_community_account.stake_counter += 1;
    accounts.user_account.total_staked += 1;

    Ok(())
}

impl<'info> StakeNftToPool<'info> {
    fn delegate(&self, community_idx: u32, rederived_bump: u8) -> anchor_lang::prelude::Result<()> {
        // Delegate as owner authority to the community pool PDA
        let cpi_accounts: Approve<'_> = Approve {
            to: self.user_nft_token_account.to_account_info(),
            delegate: self.community_pool.to_account_info(),
            authority: self.user.to_account_info(),
        };
        let cpi_program: AccountInfo<'_> = self.token_program.to_account_info();
        let cpi_context: CpiContext<'_, '_, '_, '_, Approve<'_>> = CpiContext::new(
            cpi_program,
            cpi_accounts
        );
        token::approve(cpi_context, 1)?;
        Ok(())
    }

    fn freeze(&self, community_idx: u32, rederived_bump: u8) -> anchor_lang::prelude::Result<()> {
        let main_pool_key: Pubkey = self.main_pool.key();

        // Seeds for freezing
        let seeds = &[
            COMMUNITY_SEED.as_bytes(),
            main_pool_key.as_ref(),
            &community_idx.to_be_bytes(),
            &[rederived_bump],
        ];
        // Freeze delegated account
        invoke_signed(
            &freeze_delegated_account(
                *self.token_metadata_program.key,
                self.community_pool.key(),
                self.user_nft_token_account.key(),
                *self.edition_id.key,
                self.nft_mint.key()
            ),
            &[
                self.community_pool.to_account_info().clone(),
                self.user_nft_token_account.to_account_info(),
                self.edition_id.to_account_info(),
                self.nft_mint.to_account_info(),
            ],
            &[seeds]
        )?;
        Ok(())
    }
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
