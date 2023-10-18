use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct NftTicket {
    pub mint: Pubkey, // 32
    pub stake_time: i64, // Set once at the start
    pub claimed_time: i64, // Each time it is claimed
    pub policy: Pubkey,
}

impl NftTicket {
    pub fn set(&mut self, other: &NftTicket) {
        self.mint = other.mint; // Mint of the individual NFT to compare against
        self.claimed_time = other.claimed_time;
        self.policy = other.policy;
        self.stake_time = other.stake_time;
    }
}
