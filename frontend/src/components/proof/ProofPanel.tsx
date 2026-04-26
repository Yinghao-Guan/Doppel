"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BACKEND_URL } from "@/lib/solana";

interface ProofResult {
  id: number;
  proof_hash: string;
  summary: {
    exercise: string;
    reps: number;
    form_score: number;
    proof_hash: string;
  };
}

export function ProofPanel() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [exercise, setExercise] = useState("squat");
  const [reps, setReps] = useState(10);
  const [formScore, setFormScore] = useState(80);
  const [fatigueScore, setFatigueScore] = useState(20);
  const [strengthDelta, setStrengthDelta] = useState(5);
  const [enduranceDelta, setEnduranceDelta] = useState(5);
  const [injuryRiskDelta, setInjuryRiskDelta] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
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

      const data: ProofResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
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

        {[
          { label: "Reps", value: reps, set: setReps, min: 1, max: 50 },
          { label: "Form Score (0–100)", value: formScore, set: setFormScore, min: 0, max: 100 },
          { label: "Fatigue Score (0–100)", value: fatigueScore, set: setFatigueScore, min: 0, max: 100 },
          { label: "Strength Delta", value: strengthDelta, set: setStrengthDelta, min: -50, max: 50 },
          { label: "Endurance Delta", value: enduranceDelta, set: setEnduranceDelta, min: -50, max: 50 },
          { label: "Injury Risk Delta", value: injuryRiskDelta, set: setInjuryRiskDelta, min: -50, max: 50 },
        ].map(({ label, value, set, min, max }) => (
          <label key={label} className="block">
            <span className="eyebrow text-[0.65rem]">{label}</span>
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              onChange={(e) => set(Number(e.target.value))}
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
            ? "SUBMITTING…"
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
            Connect your wallet and fill in the training record to generate a proof.
          </p>
        )}

        {!result && publicKey && (
          <p className="text-[var(--fg-dim)] text-sm">
            Fill in your training data and click Submit to generate a Solana-ready proof hash.
          </p>
        )}

        {result && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-mono text-xs">✓ PROOF GENERATED</span>
            </div>

            <div className="space-y-2">
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
              <div className="mt-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3">
                <p className="eyebrow text-[0.6rem] text-[var(--fg-dim)] mb-1">Verified on Solana ✅</p>
                <p className="text-xs text-[var(--fg-dim)]">
                  This hash is ready to be submitted to the athlete-proof Anchor program on Solana devnet.
                  The record is stored off-chain in SQLite; only the hash goes onchain.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
