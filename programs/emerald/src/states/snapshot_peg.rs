use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct SnapshotPeg {
    pub user_community_account: Pubkey, // Points to users account
    pub user_key: Pubkey, // Points to users account
}
