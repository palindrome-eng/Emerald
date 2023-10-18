use anchor_lang::prelude::*;
use crate::errors::*;
use spl_math::precise_number::PreciseNumber;

// Total size: 128
#[account]
#[derive(Default)]
pub struct CollectionPolicy {
    /** Amount of tokens paid out per NFT in this collection per epoch. */
    pub rate: u64,
    /** Length of the epoch in seconds */
    pub epoch: i64,
    /** Minimum amount of time that has to pass since staking until it can be withdrawn */
    pub minimum_stake_time: i64,
    /** Window for claiming without applying attenuation */
    pub interaction_frequency: i64,
    /** Percent multiplier, 3 digit XXX representing XX.X% */
    pub attenuation: u32,
    /** Immutable, admin can't change its parameters */
    pub permanent_policy: bool,
    /** Can only be staked against this policy until this time */
    pub time_capped: i64,
}

impl CollectionPolicy {
    pub fn exceeded_min_lockup(&self, time_now: i64, stake_time: i64) -> bool {
        time_now > stake_time + self.minimum_stake_time
    }

    pub fn exceeded_interaction_threshold(&self, time_now: i64, claimed_time: i64) -> bool {
        msg!("time now    : {:?}", time_now);
        msg!("claimed_time: {:?}", claimed_time);
        msg!("interaction : {:?}", self.interaction_frequency);
        msg!(
            "time_now < claimed_time + self.interaction_frequency : {:?}",
            time_now > claimed_time + self.interaction_frequency
        );
        time_now > claimed_time + self.interaction_frequency
    }

    pub fn within_time_cap(&self, time_now: i64) -> bool {
        if self.time_capped == 0 {
            return true;
        }
        time_now < self.time_capped
    }

    pub fn update(&mut self, rate: u64, epoch: i64, minimum_stake_time: i64) {
        // TODO assert it is not immutable
        self.rate = rate;
        self.epoch = epoch;
        self.minimum_stake_time = minimum_stake_time;
    }

    // The `calculate_reward` function calculates the staking reward based on the
    // `rate`, `epoch`, `last_claimed`, and `time_now` parameters.
    //  It returns a `Result` type with a `u64` reward value or an error
    pub fn calculate_reward(
        &self,
        time_now: &i64,
        claimed_time: &i64,
        decimal_places: &u8
    ) -> Result<u64> {
        let precise_rate: PreciseNumber = PreciseNumber::new(self.rate as u128)
            .ok_or(error!(StakingError::ConversionFailed))?
            .checked_mul(
                &PreciseNumber::new(10)
                    .ok_or(error!(StakingError::ConversionFailed))?
                    .checked_pow(*decimal_places as u128)
                    .ok_or(error!(StakingError::ConversionFailed))?
            )
            .ok_or(error!(StakingError::ConversionFailed))?;

        msg!("Precise rate = {:?}", precise_rate);

        // Calculate elapsed time
        let elapsed_time: i64 = time_now - claimed_time;

        // Convert the elapsed time into a `PreciseNumber` for precise calculations.
        let elapsed_time_precise: PreciseNumber = PreciseNumber::new(elapsed_time as u128).ok_or(
            error!(StakingError::ConversionFailed)
        )?;

        // Convert the `epoch` into a `PreciseNumber` for precise calculations.
        let precise_epoch: PreciseNumber = PreciseNumber::new(self.epoch as u128).ok_or(
            error!(StakingError::ConversionFailed)
        )?;

        // Multiply the `precise_rate` by `elapsed_time_precise` to get the total rewards for elapsed time.
        let total_rewards_for_elapsed_time: PreciseNumber = precise_rate
            .checked_mul(&elapsed_time_precise)
            .ok_or(error!(StakingError::ConversionFailed))?;

        // Calculate the proportion of the total rewards that belongs to the current epoch by dividing
        // the `total_rewards_for_elapsed_time` by the `precise_epoch`.
        let reward: PreciseNumber = total_rewards_for_elapsed_time
            .checked_div(&precise_epoch)
            .ok_or(error!(StakingError::ConversionFailed))?;

        // Attempt to convert the `reward` from a `PreciseNumber` back to a `u64`.
        reward
            .to_imprecise()
            .map(|v| v as u64)
            .ok_or(error!(StakingError::ConversionFailed))
    }

    pub fn calculate_scaled_reward(&self, reward: &u64) -> Result<u64> {
        // Convert the `reward` and `scaling` into a `PreciseNumber` to enable precise calculations.
        let precise_reward: PreciseNumber = PreciseNumber::new(
            (*reward as u128) * (self.attenuation as u128)
        ).ok_or(error!(StakingError::ConversionFailed))?;

        // Since scaling is meant to be a percentage, we need to divide by 1000 after the multiplication.
        // We create a `PreciseNumber` representation of 1000.
        let thousand: PreciseNumber = PreciseNumber::new(1000 as u128).ok_or(
            error!(StakingError::ConversionFailed)
        )?;

        // Divide the result of the multiplication (stored in `precise_reward`) by 1000.
        let scaled_reward: PreciseNumber = precise_reward
            .checked_div(&thousand)
            .ok_or(error!(StakingError::ConversionFailed))?;

        // Attempt to convert the `scaled_reward` from a `PreciseNumber` back to a `u64`.
        scaled_reward
            .to_imprecise()
            .map(|v| v as u64)
            .ok_or(error!(StakingError::ConversionFailed))
    }
}
