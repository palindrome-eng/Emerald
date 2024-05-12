import { PublicKey } from "@solana/web3.js";
import { METAPLEX } from "./consts";
import path from "path";
import fs from "fs";
import * as anchor from "@project-serum/anchor";

export const METADATA_PROGRAM_PUBKEY = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const METADATA_PREFIX = "metadata";
export const EDITION_PREFIX = "edition";
export const TOKEN_RECORD: string = "token_record";

export function delay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export const findTokenRecordPda = (mintPubkey, token) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      METADATA_PROGRAM_PUBKEY.toBuffer(),
      mintPubkey.toBuffer(),
      Buffer.from(TOKEN_RECORD),
      token.toBuffer(),
    ],
    METADATA_PROGRAM_PUBKEY
  )[0];
};

export function loadKeypairFromFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  let secretKeyString;
  try {
    secretKeyString = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error("Error reading file:", err);
  }
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));

  let keypair: anchor.web3.Keypair;
  try {
    keypair = anchor.web3.Keypair.fromSeed(
      Uint8Array.from(Buffer.from(secretKey).slice(0, 32))
    );
  } catch (err) {
    console.log("Error creating keypair:", err);
  }

  return keypair;
}
export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [Buffer.from("metadata"), METAPLEX.toBuffer(), mint.toBuffer()],
      METAPLEX
    )
  )[0];
};

export interface RemainStruct {
  pubkey: PublicKey;
  isWritable: boolean;
  isSigner: boolean;
}

export const secNow = (): number => {
  return Math.floor(Date.now() / 1000);
};

// export function createBNArray(length: number, value: number): BN[] {
//   return Array.from({ length }, () => new BN(value));
// }

export function appendAddress(
  existingAccounts: RemainStruct[],
  additionalAddresses: PublicKey[],
  isWritable = false,
  isSigner = false
): RemainStruct[] {
  // Map over the additional addresses and create RemainStruct objects for each
  const newAccounts = additionalAddresses.map((address) => {
    return {
      pubkey: address,
      isWritable: isWritable, // Set to false for immutable
      isSigner: isSigner,
    };
  });

  // Concatenate the existing accounts with the new ones and return
  return existingAccounts.concat(newAccounts);
}

export function roughlyEqual(
  desired: number,
  actual: number,
  deviation: number
) {
  const lowerBound = desired - desired * (deviation / 100);
  const upperBound = desired + desired * (deviation / 100);

  console.log("lowerBound: ", lowerBound);
  console.log("upperBound: ", upperBound);
  console.log("desired: ", desired);
  console.log("actual: ", actual);

  return actual >= lowerBound && actual <= upperBound;
}
