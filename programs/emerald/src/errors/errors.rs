use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Invalid Metadata Address")]
    InvalidMetadata,

    #[msg("Fee reduction must be within 0-100")]
    IncorrectFeeReduction,

    #[msg("Can't Parse The NFT's Creators")]
    MetadataCreatorParseError,

    #[msg("Provided NFT is not a member of provided collection")]
    NftDoesntMatchCollectionPda,

    #[msg("Creator of the NFT is not the expected creator")]
    UnexpectedCreator,

    #[msg("Creator of the NFT is not the expected creator")]
    UnverifiedCreator,

    #[msg("Couldnt up the number")]
    ConversionFailed,

    #[msg("Provided NFT is not stored in the NFT PDA")]
    NftTicketMismatch,

    #[msg("NFT needs to be staked longer to withdraw")]
    NotStakedLongEnough,

    #[msg("Ensure correct addresses for collection provided")]
    IncorrectCollectionAddresses,

    #[msg("Ensure rate is non-zero")]
    ZeroValueRate,

    #[msg("Ensure epoch is non-zero")]
    ZeroValueEpoch,

    #[msg("Community address does not match user community account")]
    CommunityMismatch,

    #[msg("Promotion period has ended")]
    TimeCapExceeded,

    #[msg("Length of total remaining accounts is equal to collection index vector")]
    TooFewCollectionsProvided,

    #[msg("Length of collection and policy indexes vectors can't be zero")]
    EmptyVector,

    #[msg("Number of collections larger than the number of indexes")]
    TooManyCollections1,

    #[msg("Number of policies exceeds number of policy choices")]
    TooManyPolicies,

    #[msg("Number of collections exceeds number of collection choices")]
    TooManyCollections,

    #[msg("Provided collection policy does not match derived one")]
    CollectionPolicyMismatch,

    #[msg("Provided collection does not match derived one")]
    CollectionMismatch,

    #[msg("Index for collections and policies must be the same size")]
    IndexesMismatch,

    #[msg("Policy indexes must match the number of provided policies policy accounts")]
    IncorrectPolicyCount,

    #[msg("Collection indexes must match the number of provided collections accounts")]
    IncorrectCollectionCount,

    #[msg("Unable to withdraw from the community pool")]
    CommunityLocked,

    #[msg("Unable to modify this policy")]
    PolicyLocked,

    #[msg("Incorrect admin provided")]
    IncorrectSuperAdmin,

    #[msg("Incorrect decimals. Exceeds 18")]
    IncorrectSPLDecimals,
}
