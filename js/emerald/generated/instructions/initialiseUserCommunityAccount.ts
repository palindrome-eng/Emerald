/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category InitialiseUserCommunityAccount
 * @category generated
 */
export type InitialiseUserCommunityAccountInstructionArgs = {
  communityIdx: number
}
/**
 * @category Instructions
 * @category InitialiseUserCommunityAccount
 * @category generated
 */
export const initialiseUserCommunityAccountStruct = new beet.BeetArgsStruct<
  InitialiseUserCommunityAccountInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['communityIdx', beet.u32],
  ],
  'InitialiseUserCommunityAccountInstructionArgs'
)
/**
 * Accounts required by the _initialiseUserCommunityAccount_ instruction
 *
 * @property [_writable_, **signer**] user
 * @property [_writable_] mainPool
 * @property [_writable_] communityPool
 * @property [_writable_] taken
 * @property [_writable_] userAccount
 * @property [_writable_] userCommunityAccount
 * @property [_writable_] snapshotPeg
 * @category Instructions
 * @category InitialiseUserCommunityAccount
 * @category generated
 */
export type InitialiseUserCommunityAccountInstructionAccounts = {
  user: web3.PublicKey
  mainPool: web3.PublicKey
  communityPool: web3.PublicKey
  taken: web3.PublicKey
  userAccount: web3.PublicKey
  userCommunityAccount: web3.PublicKey
  snapshotPeg: web3.PublicKey
  systemProgram?: web3.PublicKey
  rent?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const initialiseUserCommunityAccountInstructionDiscriminator = [
  161, 135, 10, 188, 206, 22, 144, 178,
]

/**
 * Creates a _InitialiseUserCommunityAccount_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category InitialiseUserCommunityAccount
 * @category generated
 */
export function createInitialiseUserCommunityAccountInstruction(
  accounts: InitialiseUserCommunityAccountInstructionAccounts,
  args: InitialiseUserCommunityAccountInstructionArgs,
  programId = new web3.PublicKey('2HLsq8QGhRnUUwuukCKLNdpvNc4utW6AQVV1VoY9jgEd')
) {
  const [data] = initialiseUserCommunityAccountStruct.serialize({
    instructionDiscriminator:
      initialiseUserCommunityAccountInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.user,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.mainPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.communityPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.taken,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.userAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.userCommunityAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.snapshotPeg,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rent ?? web3.SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}