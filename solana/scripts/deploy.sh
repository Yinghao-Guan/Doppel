#!/usr/bin/env bash
# Deploy athlete-proof to Solana devnet
set -euo pipefail

cd "$(dirname "$0")/../athlete-proof"

echo "→ Setting cluster to devnet"
solana config set --url devnet

echo "→ Airdropping 2 SOL"
solana airdrop 2 || echo "Airdrop may have failed (rate limited), continuing..."

echo "→ Building Anchor program"
anchor build

echo "→ Deploying to devnet"
anchor deploy

echo "→ Copying IDL to solana/idl/"
mkdir -p ../idl
cp target/idl/athlete_proof.json ../idl/

echo "✓ Deployed. Save the program ID shown above in frontend/src/lib/solana.ts"
