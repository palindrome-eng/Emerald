use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/* Used to see all the people that have ever created an acount with this community. Can be used to list all current stakers. */
pub struct SnapshotPeg {
    /** Points to user's community account. */
    pub user_community_account: Pubkey,
    /** Points to user's pubkey. */
    pub user_key: Pubkey,
}
