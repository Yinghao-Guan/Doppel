/**
 * Solana program constants and helpers.
 * Update PROGRAM_ID after running `anchor deploy`.
 */
export const PROGRAM_ID = "2uX6mMi35SdGfBCfJidEnjRjTo1cXAVEQGeJdtrm1up7";
export const BACKEND_URL =
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
