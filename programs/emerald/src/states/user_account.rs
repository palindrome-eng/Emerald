use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/** Starting point to fetch all the information for the public key it was derived from accross all comunities */
pub struct UserAccount {
    /**Index for deriving and looking up communities. */
    pub community_counter: u32, // Index for deriving and looking up communities
    /** Staked accross all communities. */
    pub total_staked: u32,
    pub total_loaned: u32, // Loaned accross all communities
}
