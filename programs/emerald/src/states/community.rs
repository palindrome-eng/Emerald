use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct CommunityPool { // 8 + 40
    pub fee_reduction: u8, // 0 => no reduction, 100 => 100% reduction
    pub community_admin: Pubkey, // 32
    /** Withdraws are locked */
    pub locked: bool,
    pub coin_mint: Pubkey, // 32
    pub coin_decimals: u8,
    pub total_staked_count: u64, // 8
    pub total_reward_distributed: u64, // 8
    pub collections_idx: u32,
    pub total_users: u32,
    pub locked_balance: u64,
}
