use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct MainPool {
    pub super_admin: Pubkey,
    pub total_communities: u32,
    pub total_users: u32,
    pub user_community_account_creation_fee: u64,
    pub community_creation_fee: u64,
    pub collection_addition_fee: u64,
    pub collection_policy_addition_fee: u64,
    pub unstake_fee: u64,
}
