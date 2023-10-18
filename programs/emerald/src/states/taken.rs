use anchor_lang::prelude::*;

// By existing it does not allow to create another community account
#[account]
#[derive(Default)]
pub struct Taken {}
