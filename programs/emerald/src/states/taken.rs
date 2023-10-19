use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
/** By existing it does not allow to create another community account. */
pub struct Taken {}
