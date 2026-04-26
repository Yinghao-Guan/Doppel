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

async function main() {
  const recipient = new PublicKey(requireEnv("BADGE_RECIPIENT"));
  const uri = requireEnv("BADGE_METADATA_URI");

  const connection = new Connection(
    process.env.SOLANA_RPC_URL?.trim() || clusterApiUrl("devnet"),
    "confirmed",
  );
  const payer = Keypair.fromSecretKey(loadSecretKey());
  const mint = Keypair.generate();

  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint.publicKey,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const rentLamports = await connection.getMinimumBalanceForRentExemption(82);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedTokenAccount,
    recipient,
    mint.publicKey,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const tx = new Transaction().add(
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
    createAtaIx,
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
      mintAddress: mint.publicKey.toBase58(),
      txSignature,
      recipient: recipient.toBase58(),
      metadataUri: uri,
    }),
  );
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
