use anchor_lang::prelude::*;

pub fn take_fee<'info>(
    recipient: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    fee: u64,
    fee_reduction: u8
) -> Result<()> {
    // Only take fee if not invoked by admin
    let lamport_fee: u64;
    match fee_reduction {
        0 => {
            lamport_fee = fee;
        }
        100 => {
            return Ok(());
        }
        _ => {
            lamport_fee = (fee * (100 - (fee_reduction as u64))) / 100;
            msg!("lamport_fee: {:?}", lamport_fee);
        }
    }

    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &payer.key(),
        &recipient.key(),
        lamport_fee
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[payer.to_account_info(), recipient.to_account_info()]
    )?;

    Ok(())
}
