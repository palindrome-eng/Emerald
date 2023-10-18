/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import * as beet from '@metaplex-foundation/beet'

/**
 * Arguments used to create {@link SnapshotPeg}
 * @category Accounts
 * @category generated
 */
export type SnapshotPegArgs = {
  userCommunityAccount: web3.PublicKey
  userKey: web3.PublicKey
}

export const snapshotPegDiscriminator = [184, 82, 26, 64, 104, 23, 219, 118]
/**
 * Holds the data for the {@link SnapshotPeg} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class SnapshotPeg implements SnapshotPegArgs {
  private constructor(
    readonly userCommunityAccount: web3.PublicKey,
    readonly userKey: web3.PublicKey
  ) {}

  /**
   * Creates a {@link SnapshotPeg} instance from the provided args.
   */
  static fromArgs(args: SnapshotPegArgs) {
    return new SnapshotPeg(args.userCommunityAccount, args.userKey)
  }

  /**
   * Deserializes the {@link SnapshotPeg} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [SnapshotPeg, number] {
    return SnapshotPeg.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link SnapshotPeg} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<SnapshotPeg> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find SnapshotPeg account at ${address}`)
    }
    return SnapshotPeg.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      '2HLsq8QGhRnUUwuukCKLNdpvNc4utW6AQVV1VoY9jgEd'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, snapshotPegBeet)
  }

  /**
   * Deserializes the {@link SnapshotPeg} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [SnapshotPeg, number] {
    return snapshotPegBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link SnapshotPeg} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return snapshotPegBeet.serialize({
      accountDiscriminator: snapshotPegDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link SnapshotPeg}
   */
  static get byteSize() {
    return snapshotPegBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link SnapshotPeg} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      SnapshotPeg.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link SnapshotPeg} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === SnapshotPeg.byteSize
  }

  /**
   * Returns a readable version of {@link SnapshotPeg} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      userCommunityAccount: this.userCommunityAccount.toBase58(),
      userKey: this.userKey.toBase58(),
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const snapshotPegBeet = new beet.BeetStruct<
  SnapshotPeg,
  SnapshotPegArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['userCommunityAccount', beetSolana.publicKey],
    ['userKey', beetSolana.publicKey],
  ],
  SnapshotPeg.fromArgs,
  'SnapshotPeg'
)
