use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/** User account for a particular community. */
pub struct UserCommunityAccount {
    pub community_address: Pubkey,
    pub accumulated_reward: u64,
    pub stake_counter: u32,
    pub loan_counter: u32,
}
