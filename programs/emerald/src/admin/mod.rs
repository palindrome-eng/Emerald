pub mod add_collection;
pub mod add_collection_policy;
pub mod update_collection_policy;
pub mod initialise_community;
pub mod withdraw_community;
pub mod lock_community;
pub mod update_admin;

// If you want to re-export items from these modules:
pub use add_collection::*;
pub use add_collection_policy::*;
pub use update_collection_policy::*;
pub use initialise_community::*;
pub use withdraw_community::*;
pub use lock_community::*;
pub use update_admin::*;

// pub mod update_collection_policy::*;
// pub mod withdraw_community;
// pub use withdraw_community::*;
