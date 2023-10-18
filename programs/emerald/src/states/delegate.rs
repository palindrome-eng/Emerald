use anchor_lang::prelude::*;

#[account]
pub struct Delegate {
    pub delegate: Pubkey, // Can claim on behalf of main staker
}
