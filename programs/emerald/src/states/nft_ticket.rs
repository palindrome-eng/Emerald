use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/** Created when staked, and closed when unstaked. */
pub struct NftTicket {
    pub mint: Pubkey, // 32
    /** Set once at the start. */
    pub stake_time: i64,
    /** Last claim time, updated on each claim. */
    pub claimed_time: i64,
    /** Pointer to the policy this NFT is staked under. */
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
