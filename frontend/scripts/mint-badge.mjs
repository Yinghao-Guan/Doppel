import {
  AnchorProvider,
  Program,
} from "@coral-xyz/anchor";
import {
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${name}.`);
  }
  return value;
}

function loadSecretKey() {
  const raw = requireEnv("BADGE_MINTER_SECRET_KEY");
  if (raw.startsWith("[")) {
    return Uint8Array.from(JSON.parse(raw));
  }
  return Uint8Array.from(
    raw.split(",").map((value) => Number.parseInt(value.trim(), 10)),
  );
}

function loadIdl() {
  return JSON.parse(
    readFileSync(new URL("../src/lib/athlete_proof.json", import.meta.url), "utf8"),
  );
}

function createWallet(payer) {
  return {
    publicKey: payer.publicKey,
    async signTransaction(tx) {
      tx.partialSign(payer);
      return tx;
    },
    async signAllTransactions(txs) {
      return txs.map((tx) => {
        tx.partialSign(payer);
        return tx;
      });
    },
  };
}

async function main() {
  const recipient = new PublicKey(requireEnv("BADGE_RECIPIENT"));
  const badgeId = requireEnv("BADGE_ID");
  const uri = requireEnv("BADGE_METADATA_URI");

  const idl = loadIdl();
  const programId = new PublicKey(process.env.BADGE_PROGRAM_ID?.trim() || idl.address);
  const connection = new Connection(
    process.env.SOLANA_RPC_URL?.trim() || clusterApiUrl("devnet"),
    "confirmed",
  );
  const payer = Keypair.fromSecretKey(loadSecretKey());
  const wallet = createWallet(payer);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl, provider);
  const mint = Keypair.generate();

  const [badgeConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("badge-config")],
    programId,
  );
  const [badgeAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("badge"), recipient.toBuffer(), Buffer.from(badgeId)],
    programId,
  );

  await ensureBadgeConfig(program, badgeConfigPda, payer.publicKey);

  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint.publicKey,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const rentLamports = await connection.getMinimumBalanceForRentExemption(82);

  const claimIx = await program.methods
    .claimBadge(badgeId, mint.publicKey, uri)
    .accounts({
      badgeConfig: badgeConfigPda,
      badgeAccount: badgeAccountPda,
      owner: recipient,
      authority: payer.publicKey,
    })
    .instruction();

  const tx = new Transaction().add(
    claimIx,
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      0,
      payer.publicKey,
      payer.publicKey,
      TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAccount,
      recipient,
      mint.publicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createMintToInstruction(
      mint.publicKey,
      associatedTokenAccount,
      payer.publicKey,
      1,
      [],
      TOKEN_PROGRAM_ID,
    ),
    createSetAuthorityInstruction(
      mint.publicKey,
      payer.publicKey,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_PROGRAM_ID,
    ),
    createSetAuthorityInstruction(
      mint.publicKey,
      payer.publicKey,
      AuthorityType.FreezeAccount,
      null,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const txSignature = await sendAndConfirmTransaction(connection, tx, [payer, mint], {
    commitment: "confirmed",
  });

  process.stdout.write(
    JSON.stringify({
      badgeAccount: badgeAccountPda.toBase58(),
      mintAddress: mint.publicKey.toBase58(),
      txSignature,
      recipient: recipient.toBase58(),
      metadataUri: uri,
    }),
  );
}

async function ensureBadgeConfig(program, badgeConfigPda, authorityPubkey) {
  try {
    const account = await program.account.badgeConfig.fetch(badgeConfigPda);
    if (account.authority.toBase58() !== authorityPubkey.toBase58()) {
      throw new Error("Badge config authority does not match BADGE_MINTER_SECRET_KEY.");
    }
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Account does not exist")) {
      throw error;
    }
  }

  await program.methods
    .initializeBadgeConfig()
    .accounts({
      badgeConfig: badgeConfigPda,
      authority: authorityPubkey,
    })
    .rpc();
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
