export * from './Collection'
export * from './CollectionPolicy'
export * from './CommunityPool'
export * from './Delegate'
export * from './MainPool'
export * from './NftTicket'
export * from './SnapshotPeg'
export * from './Taken'
export * from './UserAccount'
export * from './UserCommunityAccount'

import { CollectionPolicy } from './CollectionPolicy'
import { Collection } from './Collection'
import { CommunityPool } from './CommunityPool'
import { Delegate } from './Delegate'
import { MainPool } from './MainPool'
import { NftTicket } from './NftTicket'
import { SnapshotPeg } from './SnapshotPeg'
import { Taken } from './Taken'
import { UserAccount } from './UserAccount'
import { UserCommunityAccount } from './UserCommunityAccount'

export const accountProviders = {
  CollectionPolicy,
  Collection,
  CommunityPool,
  Delegate,
  MainPool,
  NftTicket,
  SnapshotPeg,
  Taken,
  UserAccount,
  UserCommunityAccount,
}
