use anchor_lang::prelude::*;

#[account]
/** Address of the acount that can claim on behalf of the staker. */
pub struct Delegate {
    pub delegate: Pubkey,
}
