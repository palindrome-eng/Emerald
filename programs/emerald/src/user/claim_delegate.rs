use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Token, TokenAccount, Transfer };

use crate::states::*;
use crate::constants::*;
use crate::errors::*;
use crate::take_fee;

pub fn claim_delegate<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ClaimDelegate<'info>>,
    community_idx: u32
) -> Result<()> {
    let delegate: &Signer = &mut ctx.accounts.delegate_caller;
    let nft_ticket: &mut Account<'_, NftTicket> = &mut ctx.accounts.nft_ticket;
    let user_community_account: &mut Box<
        Account<'_, UserCommunityAccount>
    > = &mut ctx.accounts.user_community_account;
    let collection_policy: &mut Account<'_, CollectionPolicy> = &mut ctx.accounts.collection_policy;
    let main_pool: &mut Account<'_, MainPool> = &mut ctx.accounts.main_pool;
    let community_pool: &mut Box<Account<'_, CommunityPool>> = &mut ctx.accounts.community_pool;
    let reward_vault: &mut Box<Account<'_, TokenAccount>> = &mut ctx.accounts.reward_vault;

    let time_now: i64 = Clock::get().unwrap().unix_timestamp;

    take_fee(
        &main_pool.to_account_info(),
        &delegate,
        ((main_pool.unstake_fee as f64) / 2.0) as u64,
        community_pool.fee_reduction
    )?;

    require!(
        collection_policy.key() == nft_ticket.policy,
        StakingError::NftDoesntMatchCollectionPda
    );

    // msg!("derived_nft_pda: {:?}", derived_nft_pda);
    msg!("\nuser: {:?}", delegate.key());

    // msg!("time_now: {:?}", time_now);
    // msg!("withdraw time: {:?}", nft_ticket.stake_time + pol.min_lock_up);

    // Calculate the reward
    let mut reward: u64 = collection_policy
        .calculate_reward(&time_now, &nft_ticket.claimed_time, &community_pool.coin_decimals)
        .unwrap();

    msg!(
        "Reward: {:?} for staking for {:?}s at a rate of {:?} per {:?}seconds",
        reward,
        &time_now - &nft_ticket.claimed_time,
        collection_policy.rate,
        collection_policy.epoch
    );

    // Scale back based on penalty and timeout
    if
        collection_policy.attenuation != 1000 &&
        collection_policy.exceeded_interaction_threshold(time_now, nft_ticket.claimed_time)
    {
        msg!("exceeded interaction threshold");
        // Calc scaled reward
        reward = collection_policy.calculate_scaled_reward(&reward)?;
    }

    msg!("Attention scaled reward: {:?}", reward);

    msg!(
        "Normalised final reward: {:?}",
        reward / (10u64).pow(community_pool.coin_decimals as u32)
    );

    // Update last claimed time
    nft_ticket.claimed_time = time_now;

    msg!("Decimal scaled reward: {:?}", reward);
    msg!("Vault balance        : {:?}", reward_vault.amount);

    // Send earned tokens to users ATA
    if reward_vault.amount > 0 {
        // If less left than the staking reward, withdraw whatever is left
        if reward > reward_vault.amount {
            msg!("Reward is greater than vault amount, withdrawing vault amount");
            reward = reward_vault.amount;
        }
        user_community_account.accumulated_reward += reward;

        // Recalculate bump
        let (_, rederived_bump) = anchor_lang::prelude::Pubkey::find_program_address(
            &[COMMUNITY_SEED.as_bytes(), main_pool.key().as_ref(), &community_idx.to_be_bytes()],
            &ctx.program_id
        );

        let main_pool_key: Pubkey = main_pool.key();
        // Seeds for signing
        let seeds = &[
            COMMUNITY_SEED.as_bytes(),
            main_pool_key.as_ref(),
            &community_idx.to_be_bytes(),
            &[rederived_bump],
        ];

        // Seeds for PDA transfer
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: community_pool.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                cpi_accounts,
                signer
            ),
            reward
        )?;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    community_idx: u32,   
    collection_idx: u32,   
    collection_policy_idx: u32,   
    user_community_account_idx: u32,
    nft_mint: Pubkey,
    owner: Pubkey
)]
pub struct ClaimDelegate<'info> {
    #[account(mut)]
    pub delegate_caller: Signer<'info>,

    #[account(mut, seeds = [MAIN_SEED.as_ref()], bump)]
    pub main_pool: Account<'info, MainPool>,

    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED.as_bytes(),&owner.as_ref(),  &main_pool.key().as_ref()],
        bump
    )]
    pub user_account: Box<Account<'info, UserAccount>>,

    #[account(
        mut,
        seeds = [
            USER_COMMUNITY_ACCOUNT_SEED.as_bytes(),
            &owner.as_ref(),
            &user_account.key().as_ref(),
            &user_community_account_idx.to_be_bytes(),
        ],
        bump,        
    )]
    pub user_community_account: Box<Account<'info, UserCommunityAccount>>,

    // Has a check to ensure only the delegate can call
    #[account(
        seeds = [DELEGATE_SEED.as_bytes(), &user_account.key().as_ref()],
        bump,
        constraint = delegate_pda.delegate == delegate_caller.key()
    )]
    pub delegate_pda: Account<'info, Delegate>,

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
        seeds = [
            COLLECTION_SEED.as_bytes(),
            &community_pool.key().as_ref(),
            &collection_idx.to_be_bytes(),
        ],
        bump
    )]
    pub collection: Account<'info, Collection>,

    #[account(
        mut,
        seeds = [
            NFT_TICKET.as_bytes(),
            &user_account.key().as_ref(),
            &user_community_account.key().as_ref(),
            &nft_mint.key().as_ref(),
        ],
        bump
    )]
    pub nft_ticket: Box<Account<'info, NftTicket>>,

    #[account(
        seeds = [
            COLLECTION_POLICY_SEED.as_bytes(),
            &collection.key().as_ref(),
            &community_pool.key().as_ref(),
            &collection_policy_idx.to_be_bytes(),
        ],
        bump
    )]
    pub collection_policy: Account<'info, CollectionPolicy>,

    #[account(
        mut,
        constraint = reward_vault.mint == community_pool.coin_mint,
        constraint = reward_vault.owner == community_pool.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    // Has a check to ensure only the ata of the original owner gets the reward
    #[account(
        mut,
        constraint = user_reward_account.mint == community_pool.coin_mint,        
        constraint = user_reward_account.owner == owner.key(), // TODO derive owners ATA and double check in main function
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
