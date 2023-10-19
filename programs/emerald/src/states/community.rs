use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/** Details about a particular community. */
pub struct CommunityPool { // 8 + 40
    /** 0 => no reduction, 100 => 100% reduction */
    pub fee_reduction: u8, // 0 => no reduction, 100 => 100% reduction
    /** Can add policies, collections and lock */
    pub community_admin: Pubkey, // 32
    /** Withdraws are locked */
    pub locked: bool,
    /** SPL mint of the token that is used for the rewards */
    pub coin_mint: Pubkey, // 32
    pub coin_decimals: u8,
    /** Total number of NFTs staked with this ocmmunity */
    pub total_staked_count: u64, // 8
    /** Total number of tokens distributed to date */
    pub total_reward_distributed: u64, // 8
    /** Total number of collections that can stake with this community */
    pub collections_idx: u32,
    /* Total number of accounts that created an account with this community */
    pub total_users: u32,
    /** Balance in the community vault at the instance admin is unable to withdraw more */
    pub locked_balance: u64,
}
