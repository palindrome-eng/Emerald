use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Approve, Token, TokenAccount };
use mpl_token_metadata::instruction::{
    freeze_delegated_account,
    revoke_use_authority,
    DelegateArgs,
    LockArgs,
};

use mpl_token_metadata::instruction::builders::{ Delegate, Lock };
use mpl_token_metadata::instruction::InstructionBuilder;

use solana_program::program::{ invoke_signed, invoke };

use crate::states::*;
use crate::constants::*;
use crate::errors::*;

pub fn stake_nft<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, StakeNftToPool<'info>>,
    community_idx: u32
) -> Result<()> {
    let accounts: &mut StakeNftToPool = ctx.accounts;

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

    let main_pool_key: Pubkey = accounts.main_pool.key();

    // Seeds for freezing
    let seeds = &[
        COMMUNITY_SEED.as_bytes(),
        main_pool_key.as_ref(),
        &community_idx.to_be_bytes(),
        &[rederived_bump],
    ];

    // Get users NFT amount
    let current_nft_balance = accounts.user_nft_token_account.amount as f64;
    let sub_owner = accounts.user_nft_token_account.owner;

    msg!("currentNftBalance {:?} owned by {:?}", current_nft_balance, sub_owner);
    msg!("user calling {:?}", accounts.user.key());

    // Deal with possible states of optional account using match
    match &accounts.token_record {
        Some(token_record) => {
            // Delegate auth to this program
            accounts.delegate_pnft(community_idx, rederived_bump)?;

            // Lock user
            accounts.lock_user(community_idx, rederived_bump)?;
        }
        None => {
            // Delegate as owner authority to the community pool PDA
            let cpi_accounts: Approve<'_> = Approve {
                to: accounts.user_nft_token_account.to_account_info(),
                delegate: accounts.community_pool.to_account_info(),
                authority: accounts.user.to_account_info(),
            };
            let cpi_program: AccountInfo<'_> = accounts.token_program.to_account_info();
            let cpi_context: CpiContext<'_, '_, '_, '_, Approve<'_>> = CpiContext::new(
                cpi_program,
                cpi_accounts
            );
            token::approve(cpi_context, 1)?;
            // Its not the pNFT try old way
            // Freeze delegated account
            invoke_signed(
                &freeze_delegated_account(
                    *accounts.token_metadata_program.key,
                    accounts.community_pool.key(),
                    accounts.user_nft_token_account.key(),
                    *accounts.edition_id.key,
                    accounts.nft_mint.key()
                ),
                &[
                    accounts.community_pool.to_account_info().clone(),
                    accounts.user_nft_token_account.to_account_info(),
                    accounts.edition_id.to_account_info(),
                    accounts.nft_mint.to_account_info(),
                ],
                &[seeds]
            )?;
        }
    }

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

// #[account(0, optional, writable, name="delegate_record", desc="Delegate record account")]
// #[account(1, name="delegate", desc="Owner of the delegated account")]
// #[account(2, writable, name="metadata", desc="Metadata account")]
// #[account(3, optional, name="master_edition", desc="Master Edition account")]
// #[account(4, optional, writable, name="token_record", desc="Token record account")]
// #[account(5, name="mint", desc="Mint of metadata")]
// #[account(6, optional, writable, name="token", desc="Token account of mint")]
// #[account(7, signer, name="authority", desc="Update authority or token owner")]
// #[account(8, signer, writable, name="payer", desc="Payer")]
// #[account(9, name="system_program", desc="System Program")]
// #[account(10, name="sysvar_instructions", desc="Instructions sysvar account")]
// #[account(11, optional, name="spl_token_program", desc="SPL Token Program")]
// #[account(12, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
// #[account(13, optional, name="authorization_rules", desc="Token Authorization Rules account")]

impl<'info> StakeNftToPool<'info> {
    fn delegate_pnft(
        &self,
        community_idx: u32,
        rederived_bump: u8
    ) -> anchor_lang::prelude::Result<()> {
        let delegate_args = DelegateArgs::StakingV1 { amount: 1, authorization_data: None };

        let delegate_instruction: Delegate = Delegate {
            // Trying with no delegate record
            delegate_record: None, //Some(self.token_record.clone().unwrap().key()), // Assuming you want to use token_record's pubkey

            // Delegate will need to be some PDA of this program
            delegate: self.community_pool.clone().key(),
            metadata: self.mint_metadata.key(), // Assuming 'metadata' is associated with mint_metadata
            master_edition: None, // Assuming there is no master edition in this context
            token_record: Some(self.token_record.clone().unwrap().key()), // Optional, using token_record's pubkey
            mint: self.nft_mint.key(), // Using the nft_mint pubkey
            token: Some(self.user_nft_token_account.key()), // If there is a specific token to be delegated, provide its account key
            authority: self.user.key(), // Using user's pubkey as authority
            payer: self.user.key(), // Using user's pubkey as payer
            system_program: self.system_program.key(), // System program pubkey
            sysvar_instructions: self.rent.key(), // Rent sysvar instructions pubkey
            spl_token_program: Some(self.token_program.key()), // SPL Token Program pubkey, optional
            authorization_rules_program: None, // If applicable, provide the account info
            authorization_rules: None, // If applicable, provide the account info
            args: delegate_args, // From above
        };

        let ix = delegate_instruction.instruction();

        // Below instructiosn must match the accounts in the Delegate instruction struct order
        invoke(
            &ix, // Use the instruction created from the Delegate struct
            &[
                // // self.token_record.clone().unwrap().to_account_info(), // delegate_record (also used as delegate)
                // self.community_pool.clone().to_account_info(),
                // self.mint_metadata.to_account_info(), // metadata
                // self.user.to_account_info(), // authority (also used as payer)
                // // None,
                // self.token_record.clone().unwrap().to_account_info(), // token_record
                // self.nft_mint.to_account_info(), // mint
                // self.user_nft_token_account.to_account_info(),
                // self.user.to_account_info(), // authority (also used as payer)
                // self.user.to_account_info(), // authority (also used as payer)
                // self.system_program.to_account_info(), // system_program
                // self.rent.to_account_info(), // sysvar_instructions
                // self.token_program.to_account_info(), // spl_token_program
                // // No accounts for authorization_rules_program and authorization_rules as they are None

                self.community_pool.clone().to_account_info(), // delegate
                self.mint_metadata.to_account_info(), // metadata
                self.token_record.clone().unwrap().to_account_info(), // token_record
                self.nft_mint.to_account_info(), // mint
                self.user_nft_token_account.to_account_info(), // token
                self.user.to_account_info(), // authority
                self.user.to_account_info(), // payer (repeated for clarity, same as authority)
                self.system_program.to_account_info(), // system_program
                self.rent.to_account_info(), // sysvar_instructions
                self.token_program.to_account_info(), // spl_token_program
            ]
            // &[
            //     &[
            //         COMMUNITY_SEED.as_bytes(),
            //         self.main_pool.key().as_ref(),
            //         &community_idx.to_be_bytes(),
            //         &[rederived_bump],
            //     ],
            // ] // Pass the seeds for the signed transaction
        )?;

        Ok(())
    }

    fn lock_user(
        &self,
        community_idx: u32,
        rederived_bump: u8
    ) -> anchor_lang::prelude::Result<()> {
        // Spawn lock args
        let lock_args = LockArgs::V1 { authorization_data: None };

        // Create lock instructions
        let lock_instruction: Lock = Lock {
            metadata: self.mint_metadata.key(), // Assuming 'metadata' is associated with mint_metadata
            token_record: Some(self.token_record.clone().unwrap().key()), // Optional, using token_record's pubkey
            token_owner: Some(self.user.key()), // Using user's pubkey as token_owner
            edition: Some(self.edition_id.key()), // Assuming there is an edition_id in this context
            mint: self.nft_mint.key(), // Using the nft_mint pubkey

            // This is the token account
            token: self.user_nft_token_account.key(),
            authority: self.user.key(), // Using user's pubkey as authority
            payer: self.user.key(), // Using user's pubkey as payer
            system_program: self.system_program.key(), // System program pubkey
            sysvar_instructions: self.rent.key(), // Rent sysvar instructions pubkey
            spl_token_program: Some(self.token_program.key()), // SPL Token Program pubkey, optional
            authorization_rules_program: None, // If applicable, provide the account info
            authorization_rules: None, // If applicable, provide the account info
            args: lock_args,
        };

        // Invoke signed
        invoke_signed(
            &lock_instruction.instruction(), // Use the instruction created from the Lock struct
            &[
                self.mint_metadata.to_account_info(), // metadata
                self.token_record.clone().unwrap().to_account_info(), // token_record
                self.user.to_account_info(), // token_owner
                self.edition_id.to_account_info(), // edition
                self.nft_mint.to_account_info(), // mint
                self.user_nft_token_account.to_account_info(), // token
                self.user.to_account_info(), // authority (also used as payer)
                self.system_program.to_account_info(), // system_program
                self.rent.to_account_info(), // sysvar_instructions
                self.token_program.to_account_info(), // spl_token_program
                // No accounts for authorization_rules_program and authorization_rules as they are None
            ],
            &[
                &[
                    COMMUNITY_SEED.as_bytes(),
                    self.main_pool.key().as_ref(),
                    &community_idx.to_be_bytes(),
                    &[rederived_bump],
                ],
            ] // Pass the seeds for the signed transaction
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
        constraint = user_nft_token_account.mint == nft_mint.key() @StakingError::MintTokenAccountMismatch,

        // Move to match otherwise
        constraint = user_nft_token_account.owner == *user.key @StakingError::NotOwner,
        constraint = user_nft_token_account.amount == 1 @StakingError::TokenAccountEmpty,
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

    #[account(mut)]
    pub token_record: Option<AccountInfo<'info>>,
}
