use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Token, TokenAccount, Transfer, Revoke };
use mpl_token_metadata::instruction::thaw_delegated_account;
use solana_program::program::invoke_signed;

use crate::states::*;
use crate::constants::*;
use crate::errors::*;
use crate::utils::*;

pub fn unstake_nft<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, UnstakeNftToPool<'info>>,
    community_idx: u32
) -> Result<()> {
    let accounts: &mut UnstakeNftToPool<'info> = ctx.accounts;

    // Check NFT details against collection PDA
    accounts.collection.collection_member(
        &&accounts.mint_metadata,
        &&accounts.master_mint_metadata,
        &accounts.nft_mint.key()
    )?;

    // Recalculate bump
    let (_, rederived_bump) = anchor_lang::prelude::Pubkey::find_program_address(
        &[
            COMMUNITY_SEED.as_bytes(),
            accounts.main_pool.key().as_ref(),
            &community_idx.to_be_bytes(),
        ],
        &ctx.program_id
    );

    // msg!("nft_mint.key(): {:?}", nft_mint.key());
    // msg!("unstake_nft_ticket.claimed_time: {:?}", unstake_nft_ticket.claimed_time);
    // msg!("unstake_nft_ticket.mint: {:?}", unstake_nft_ticket.mint);
    // msg!("collection_policy.rate: {:?}", collection_policy.rate);
    // msg!("collection_policy.min_lock_up: {:?}", collection_policy.minimum_stake_time);

    // Mint addres of the NFT matches the mint address stored in the NFT PDA
    require!(
        accounts.nft_mint.key() == accounts.unstake_nft_ticket.mint,
        StakingError::NftTicketMismatch
    );

    let main_pool_key: Pubkey = accounts.main_pool.key();

    // Seeds for thawing
    let seeds = &[
        COMMUNITY_SEED.as_bytes(),
        main_pool_key.as_ref(),
        &community_idx.to_be_bytes(),
        &[rederived_bump],
    ];

    // Unfreeze
    accounts.unfreeze(community_idx, rederived_bump)?;

    // Undeleagate
    accounts.undelegate(community_idx, rederived_bump)?;

    take_fee(
        &accounts.main_pool.to_account_info(),
        &accounts.user,
        accounts.main_pool.unstake_fee,
        accounts.community_pool.fee_reduction
    )?;

    // Ensure NFT has been locked up for the minnimum amount of time
    let time_now: i64 = Clock::get().unwrap().unix_timestamp;

    msg!("time_now:     {:?}", time_now);
    msg!(
        "withdraw time:{:?}",
        accounts.unstake_nft_ticket.stake_time + accounts.collection_policy.minimum_stake_time
    );

    // Staked for at least the ,ommimum amount of time
    require!(
        accounts.collection_policy.exceeded_min_lockup(
            time_now,
            accounts.unstake_nft_ticket.stake_time
        ),
        StakingError::NotStakedLongEnough
    );

    // Calculate payemnt
    let mut reward: u64 = accounts.collection_policy
        .calculate_reward(
            &time_now,
            &accounts.unstake_nft_ticket.claimed_time,
            &accounts.community_pool.coin_decimals
        )
        .unwrap();

    msg!(
        "Reward: {:?} for staking for {:?}s at a rate of {:?} per {:?}seconds",
        reward,
        &time_now - &accounts.unstake_nft_ticket.claimed_time,
        accounts.collection_policy.rate,
        accounts.collection_policy.epoch
    );

    // Scale back based on attenuation and claim window
    if
        accounts.collection_policy.attenuation != 1000 &&
        accounts.collection_policy.exceeded_interaction_threshold(
            time_now,
            accounts.unstake_nft_ticket.claimed_time
        )
    {
        reward = accounts.collection_policy.calculate_scaled_reward(&reward)?;
    }

    msg!("Attention scaled reward: {:?}", reward);
    msg!(
        "Normalised final reward: {:?}",
        reward / (10u64).pow(accounts.community_pool.coin_decimals as u32)
    );

    msg!("Vault balance        : {:?}", accounts.reward_vault.amount);

    // If nothing left in the vault, will allow to withdraw the NFT
    if accounts.reward_vault.amount > 0 {
        // If less left than the staking reward, withdraw whatever is left
        if reward > accounts.reward_vault.amount {
            msg!("Reward is greater than vault amount, withdrawing vault amount");
            reward = accounts.reward_vault.amount;
        }

        accounts.user_community_account.accumulated_reward += reward;

        msg!("\nCalculated token reward: {}", reward);
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: accounts.reward_vault.to_account_info(),
            to: accounts.user_reward_account.to_account_info(),
            authority: accounts.community_pool.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                accounts.token_program.to_account_info().clone(),
                cpi_accounts,
                signer
            ),
            reward
        )?;
    }
    msg!("collection.total_staked: {:?}", accounts.collection.total_staked);
    msg!("community_pool.total_staked_count: {:?}", accounts.community_pool.total_staked_count);
    msg!(
        "user_community_account.stake_counter: {:?}",
        accounts.user_community_account.stake_counter
    );
    msg!("user_account.total_staked {:?}", accounts.user_account.total_staked);

    // Decrement staked NFTs per community and per collection
    accounts.community_pool.total_staked_count -= 1;

    if community_idx != 0 {
        accounts.collection.total_staked -= 1;
    }

    // Decrement user active stakings counter
    accounts.user_community_account.stake_counter -= 1;
    accounts.user_account.total_staked -= 1;

    // Add total earned per community for the user
    accounts.user_community_account.accumulated_reward += reward;

    // Update claim time
    accounts.unstake_nft_ticket.claimed_time = time_now;

    Ok(())
}

impl<'info> UnstakeNftToPool<'info> {
    fn undelegate(
        &self,
        community_idx: u32,
        rederived_bump: u8
    ) -> anchor_lang::prelude::Result<()> {
        Ok(())
    }

    fn unfreeze(&self, community_idx: u32, rederived_bump: u8) -> anchor_lang::prelude::Result<()> {
        invoke_signed(
            &thaw_delegated_account(
                self.token_metadata_program.key(),
                self.community_pool.key(),
                self.user_nft_token_account.key(),
                self.edition_id.key(),
                self.nft_mint.key()
            ),
            &[
                self.community_pool.to_account_info(),
                self.user_nft_token_account.to_account_info(),
                self.edition_id.to_account_info(),
                self.nft_mint.to_account_info(),
            ],
            &[
                &[
                    COMMUNITY_SEED.as_bytes(),
                    self.main_pool.key().as_ref(),
                    &community_idx.to_be_bytes(),
                    &[rederived_bump],
                ],
            ]
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    community_idx: u32,         
    collection_idx: u32,  
    community_account: u32, 
    policy_idx: u32, 
)]
pub struct UnstakeNftToPool<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(
        mut,
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
        bump,
        constraint = collection_policy.key() == unstake_nft_ticket.policy
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
        seeds = [USER_ACCOUNT_SEED.as_bytes(), &user.key().as_ref(),  &main_pool.key().as_ref()],
        bump
    )]
    pub user_account: Box<Account<'info, UserAccount>>,

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

    #[account(
        mut,
        close = user,
        seeds = [
            NFT_TICKET.as_bytes(),
            &user_account.key().as_ref(),
            &user_community_account.key().as_ref(),
            &nft_mint.key().as_ref(),
        ],
        bump
    )]
    pub unstake_nft_ticket: Box<Account<'info, NftTicket>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        mut,
        constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    pub mint_metadata: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        mut,
        constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    pub master_mint_metadata: AccountInfo<'info>,

    #[account(
        mut,
        constraint = user_nft_token_account.mint == nft_mint.key(),
        constraint = user_nft_token_account.owner == *user.key,
        constraint = user_nft_token_account.amount == 1,
    )]
    pub user_nft_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = reward_vault.mint == community_pool.coin_mint,
        constraint = reward_vault.owner == community_pool.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_reward_account.mint == community_pool.coin_mint,
        constraint = user_reward_account.owner == *user.key,
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,

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
