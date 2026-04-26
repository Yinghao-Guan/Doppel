"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { BACKEND_URL, PROGRAM_ID } from "@/lib/solana";
import IDL from "@/lib/athlete_proof.json";

interface ProofResult {
  id: number;
  proof_hash: string;
  txSignature: string;
  summary: {
    exercise: string;
    reps: number;
    form_score: number;
  };
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

export function ProofPanel() {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [exercise, setExercise] = useState("squat");
  const [reps, setReps] = useState(10);
  const [formScore, setFormScore] = useState(80);
  const [fatigueScore, setFatigueScore] = useState(20);
  const [strengthDelta, setStrengthDelta] = useState(5);
  const [enduranceDelta, setEnduranceDelta] = useState(5);
  const [injuryRiskDelta, setInjuryRiskDelta] = useState(5);

  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!publicKey || !wallet) {
      setVisible(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // 1. Save record off-chain and get proof hash from backend
      setStatus("Saving record & generating proof hash…");
      const res = await fetch(`${BACKEND_URL}/training/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          exercise,
          reps,
          form_score: formScore,
          fatigue_score: fatigueScore,
          strength_delta: strengthDelta,
          endurance_delta: enduranceDelta,
          injury_risk_delta: injuryRiskDelta,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to save record.");
      }
      const { id, proof_hash, summary } = await res.json();

      // 2. Build Anchor program client
      const provider = new AnchorProvider(
        connection,
        wallet.adapter as never,
        { commitment: "confirmed" }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = new Program(IDL as any, provider);
      const programId = new PublicKey(PROGRAM_ID);

      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), publicKey.toBuffer()],
        programId
      );

      // 3. Initialize profile if it doesn't exist yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = program.account as any;
      try {
        await accounts.athleteProfile.fetch(profilePda);
      } catch {
        setStatus("Creating on-chain profile…");
        await program.methods
          .initializeProfile()
          .accounts({ profile: profilePda, user: publicKey })
          .rpc();
      }

      // 4. Fetch current workout count to derive proof PDA
      const profileAccount = await accounts.athleteProfile.fetch(profilePda);
      const workoutIndex: number = profileAccount.totalWorkouts as number;
      const indexBuf = Buffer.alloc(4);
      indexBuf.writeUInt32LE(workoutIndex);

      const [proofPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proof"), publicKey.toBuffer(), indexBuf],
        programId
      );

      // 5. Submit proof on-chain
      setStatus("Waiting for wallet signature…");
      const proofHashBytes = hexToBytes(proof_hash);
      const tx = await program.methods
        .submitTrainingProof(
          exercise,
          reps,
          formScore,
          Math.round((formScore + (100 - fatigueScore)) / 2), // prediction_score
          proofHashBytes
        )
        .accounts({ proof: proofPda, profile: profilePda, user: publicKey })
        .rpc();

      setStatus(null);
      setResult({ id, proof_hash, txSignature: tx, summary });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      {/* Input form */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-mono text-sm tracking-[0.15em] text-[var(--fg-dim)] uppercase">
          Training Record
        </h2>

        <label className="block">
          <span className="eyebrow text-[0.65rem]">Exercise</span>
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            <option value="squat">Squat</option>
            <option value="deadlift">Deadlift</option>
            <option value="bench_press">Bench Press</option>
            <option value="lunge">Lunge</option>
          </select>
        </label>

        {(
          [
            { label: "Reps", value: reps, set: setReps, min: 1, max: 50 },
            { label: "Form Score (0–100)", value: formScore, set: setFormScore, min: 0, max: 100 },
            { label: "Fatigue Score (0–100)", value: fatigueScore, set: setFatigueScore, min: 0, max: 100 },
            { label: "Strength Delta", value: strengthDelta, set: setStrengthDelta, min: -50, max: 50 },
            { label: "Endurance Delta", value: enduranceDelta, set: setEnduranceDelta, min: -50, max: 50 },
            { label: "Injury Risk Delta", value: injuryRiskDelta, set: setInjuryRiskDelta, min: -50, max: 50 },
          ] as const
        ).map(({ label, value, set, min, max }) => (
          <label key={label} className="block">
            <span className="eyebrow text-[0.65rem]">{label}</span>
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
        ))}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="cta w-full mt-2 py-3 font-mono text-sm tracking-[0.15em] disabled:opacity-50"
        >
          {submitting
            ? (status ?? "SUBMITTING…")
            : publicKey
            ? "SUBMIT ONCHAIN PROOF"
            : "CONNECT WALLET TO SUBMIT"}
        </button>

        {error && (
          <p className="text-red-400 text-xs font-mono mt-2">{error}</p>
        )}
      </div>

      {/* Result */}
      <div className="glass rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="font-mono text-sm tracking-[0.15em] text-[var(--fg-dim)] uppercase">
          Proof Receipt
        </h2>

        {!result && !publicKey && (
          <p className="text-[var(--fg-dim)] text-sm">
            Connect your wallet and fill in the training record to submit a proof.
          </p>
        )}

        {!result && publicKey && (
          <p className="text-[var(--fg-dim)] text-sm">
            Fill in your training data and click Submit. Your proof hash will be stored permanently on Solana devnet.
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <span className="text-green-400 font-mono text-xs">✓ VERIFIED ON SOLANA</span>

            <div>
              <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)]">Record ID</p>
              <p className="font-mono text-sm text-[var(--fg)]">#{result.id}</p>
            </div>
            <div>
              <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)]">Exercise</p>
              <p className="font-mono text-sm text-[var(--fg)] capitalize">{result.summary.exercise}</p>
            </div>
            <div>
              <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)]">Reps / Form Score</p>
              <p className="font-mono text-sm text-[var(--fg)]">
                {result.summary.reps} reps · {result.summary.form_score}/100
              </p>
            </div>
            <div>
              <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)]">SHA-256 Proof Hash</p>
              <p className="font-mono text-[0.6rem] text-[var(--accent)] break-all leading-relaxed">
                {result.proof_hash}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)]">Transaction</p>
              <a
                href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.6rem] text-[var(--accent)] break-all leading-relaxed underline hover:opacity-80"
              >
                {result.txSignature.slice(0, 20)}…{result.txSignature.slice(-8)}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
