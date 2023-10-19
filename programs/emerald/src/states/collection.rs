use anchor_lang::prelude::*;
use crate::errors::*;
use metaplex_token_metadata::state::Metadata;
use metaplex_token_metadata::state::Creator;

// Total size: 128
#[account]
#[derive(Default)]
/** Details about a particular collection. */
pub struct Collection {
    pub master_collection_key: Pubkey,
    pub creators_key: Pubkey,
    pub master_edition_key: Pubkey,
    pub verified_creator: bool, // If false do not check verified creator
    pub total_staked: u64,
    pub total_loaned: u64,
    pub total_policies: u32,
}

impl Collection {
    pub fn collection_member(
        &self,
        mint_metadata: &&AccountInfo<'_>,
        master_mint_metadata: &&AccountInfo<'_>,
        nft_mint: &Pubkey
    ) -> Result<()> {
        Metadata::from_account_info(mint_metadata)?; // nft_metadata
        // Change below from master_nft_metadata to mint_metadata and it still works so
        // - master_mint_metadata could be removed
        // - leave it as is, and have an option for stakers using the nested way
        let master_nft_metadata: Metadata = Metadata::from_account_info(mint_metadata)?;

        let creators: Vec<Creator> = master_nft_metadata.data.creators.ok_or(
            error!(StakingError::MetadataCreatorParseError)
        )?;

        // msg!("\nnft metadata mint: {:?}", nft_metadata.mint);
        // msg!("master_nft_metadata nft mint: {:?}", master_nft_metadata.mint);
        // msg!("stored collection mint: {:?}", collection.master_collection_key);
        // msg!("stored collection edition: {:?}", collection.master_edition_key);
        // msg!("stored collection creator: {:?}", collection.creators_key);
        // msg!("provided collection edition: {:?}", ctx.accounts.edition_id.key());
        // msg!("provided collection creator: {:?}", creators[0].address);
        // Mint account matches one from provided NFT PDA
        // require!(
        //     self.master_collection_key == master_nft_metadata.mint.key(),
        //     StakingError::NftDoesntMatchCollectionPda
        // );

        let (metadata, _) = Pubkey::find_program_address(
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                nft_mint.key().as_ref(),
            ],
            &metaplex_token_metadata::id()
        );

        // Metadata account supplied the individual NFT matches one derivced from it
        require!(metadata == mint_metadata.key(), StakingError::InvalidMetadata);

        // Creator is in the metadta
        let mut present_creator: bool = false;
        let mut verified_creator: bool = false;
        for creator in creators {
            // msg!("creator {:?} is {:?}", creator.address, creator.verified);
            if creator.address == self.creators_key {
                present_creator = true;
            }
            if creator.verified {
                verified_creator = true;
            }
        }

        require!(present_creator, StakingError::UnexpectedCreator);
        if self.verified_creator {
            require!(verified_creator, StakingError::UnverifiedCreator);
        }

        Ok(())
    }
}
