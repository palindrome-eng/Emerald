use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct UserCommunityAccount {
    pub community_address: Pubkey,
    pub accumulated_reward: u64, // For gainz reference
    pub stake_counter: u32, // For deriving subsequent PDAs
    pub loan_counter: u32, // For deriving subsequent PDAs
}
