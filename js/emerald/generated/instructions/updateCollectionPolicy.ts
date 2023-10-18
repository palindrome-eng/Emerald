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
 * @category UpdateCollectionPolicy
 * @category generated
 */
export type UpdateCollectionPolicyInstructionArgs = {
  communityIdx: number
  collectionIdx: number
  collectionPolicyIdx: number
  rate: beet.bignum
  epoch: beet.bignum
  minimumStakeTime: beet.bignum
  interactionFrequency: beet.bignum
  attenuation: number
  permanentPolicy: boolean
  timeCapped: beet.bignum
}
/**
 * @category Instructions
 * @category UpdateCollectionPolicy
 * @category generated
 */
export const updateCollectionPolicyStruct = new beet.BeetArgsStruct<
  UpdateCollectionPolicyInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['communityIdx', beet.u32],
    ['collectionIdx', beet.u32],
    ['collectionPolicyIdx', beet.u32],
    ['rate', beet.u64],
    ['epoch', beet.i64],
    ['minimumStakeTime', beet.i64],
    ['interactionFrequency', beet.i64],
    ['attenuation', beet.u32],
    ['permanentPolicy', beet.bool],
    ['timeCapped', beet.i64],
  ],
  'UpdateCollectionPolicyInstructionArgs'
)
/**
 * Accounts required by the _updateCollectionPolicy_ instruction
 *
 * @property [_writable_, **signer**] admin
 * @property [_writable_] communityPool
 * @property [_writable_] collection
 * @property [_writable_] collectionPolicy
 * @property [_writable_] mainPool
 * @category Instructions
 * @category UpdateCollectionPolicy
 * @category generated
 */
export type UpdateCollectionPolicyInstructionAccounts = {
  admin: web3.PublicKey
  communityPool: web3.PublicKey
  collection: web3.PublicKey
  collectionPolicy: web3.PublicKey
  mainPool: web3.PublicKey
  systemProgram?: web3.PublicKey
  rent?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const updateCollectionPolicyInstructionDiscriminator = [
  32, 22, 46, 65, 118, 192, 201, 134,
]

/**
 * Creates a _UpdateCollectionPolicy_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category UpdateCollectionPolicy
 * @category generated
 */
export function createUpdateCollectionPolicyInstruction(
  accounts: UpdateCollectionPolicyInstructionAccounts,
  args: UpdateCollectionPolicyInstructionArgs,
  programId = new web3.PublicKey('2HLsq8QGhRnUUwuukCKLNdpvNc4utW6AQVV1VoY9jgEd')
) {
  const [data] = updateCollectionPolicyStruct.serialize({
    instructionDiscriminator: updateCollectionPolicyInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.admin,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.communityPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.collection,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.collectionPolicy,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.mainPool,
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
