use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct UserAccount {
    pub community_counter: u32, // Index for deriving and looking up communities
    pub total_staked: u32, // Staked accross all communities
    pub total_loaned: u32, // Loaned accross all communities
}
