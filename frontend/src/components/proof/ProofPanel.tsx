"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, SendTransactionError } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
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

interface Badge {
  id: string;
  name: string;
  description: string;
  short_rule: string;
  accent: string;
  eligible: boolean;
  claimed: boolean;
  claimable: boolean;
  progress: number;
  target: number;
  mint_address: string | null;
  tx_signature: string | null;
  metadata_uri: string;
  claimed_at: number | null;
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

function explorerTxLink(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function explorerTokenLink(mint: string): string {
  return `https://explorer.solana.com/address/${mint}?cluster=devnet`;
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

  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgeActionId, setBadgeActionId] = useState<string | null>(null);
  const [badgeError, setBadgeError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBadges([]);
      return;
    }
    void refreshBadges(publicKey.toBase58());
  }, [publicKey]);

  async function refreshBadges(walletAddress: string) {
    setBadgesLoading(true);
    setBadgeError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/badges/${walletAddress}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to load badges.");
      }
      setBadges(await res.json());
    } catch (e) {
      setBadgeError(e instanceof Error ? e.message : "Unknown badge error.");
    } finally {
      setBadgesLoading(false);
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!publicKey || !wallet) {
      setVisible(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
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
      const { id, proof_hash, summary, badges: nextBadges } = await res.json();

      const provider = new AnchorProvider(connection, wallet.adapter as never, {
        commitment: "confirmed",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = new Program(IDL as any, provider);
      const programId = new PublicKey(PROGRAM_ID);

      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), publicKey.toBuffer()],
        programId,
      );

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

      const profileAccount = await accounts.athleteProfile.fetch(profilePda);
      const workoutIndex: number = profileAccount.totalWorkouts as number;
      const indexBuf = Buffer.alloc(4);
      indexBuf.writeUInt32LE(workoutIndex);

      const [proofPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proof"), publicKey.toBuffer(), indexBuf],
        programId,
      );

      setStatus("Waiting for wallet signature…");
      const proofHashBytes = hexToBytes(proof_hash);
      let txSignature: string;
      try {
        txSignature = await program.methods
          .submitTrainingProof(
            exercise,
            reps,
            formScore,
            Math.round((formScore + (100 - fatigueScore)) / 2),
            proofHashBytes,
          )
          .accounts({ proof: proofPda, profile: profilePda, user: publicKey })
          .rpc();
      } catch (submitError) {
        const recoveredSignature = await recoverDuplicateSubmission(
          submitError,
          connection,
          accounts,
          proofPda,
        );
        if (!recoveredSignature) throw submitError;
        txSignature = recoveredSignature;
      }

      setStatus(null);
      setResult({ id, proof_hash, txSignature, summary });
      setBadges(nextBadges);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function claimBadge(badgeId: string) {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setBadgeActionId(badgeId);
    setBadgeError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/badges/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          badge_id: badgeId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to claim badge.");
      }
      const payload = await res.json();
      const updated = payload.badge as Badge;
      setBadges((current) =>
        current.map((badge) => (badge.id === badgeId ? updated : badge)),
      );
    } catch (e) {
      setBadgeError(e instanceof Error ? e.message : "Unknown badge error.");
    } finally {
      setBadgeActionId(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8">
      <div className="grid gap-8 md:grid-cols-2">
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

          {error && <p className="text-red-400 text-xs font-mono mt-2">{error}</p>}
        </div>

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
                  href={explorerTxLink(result.txSignature)}
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

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-mono text-sm tracking-[0.15em] text-[var(--fg-dim)] uppercase">
              Badge Vault
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--fg-dim)]">
              Reach milestones off-chain, then mint a 1/1 NFT badge to your connected wallet on Solana devnet.
            </p>
          </div>
          {publicKey && (
            <button
              onClick={() => refreshBadges(publicKey.toBase58())}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-mono tracking-[0.12em] text-[var(--fg-dim)] transition hover:text-[var(--fg)]"
            >
              REFRESH BADGES
            </button>
          )}
        </div>

        {badgeError && <p className="mt-4 text-xs font-mono text-red-400">{badgeError}</p>}

        {!publicKey && (
          <p className="mt-6 text-sm text-[var(--fg-dim)]">
            Connect a wallet to see which milestone badges are unlocked.
          </p>
        )}

        {publicKey && badgesLoading && (
          <p className="mt-6 text-sm text-[var(--fg-dim)]">Loading badge status…</p>
        )}

        {publicKey && !badgesLoading && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {badges.map((badge) => (
              <article
                key={badge.id}
                className="rounded-2xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.03)] p-5"
                style={{
                  boxShadow: badge.claimable ? `0 0 0 1px ${badge.accent}33 inset` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-[0.62rem]" style={{ color: badge.accent }}>
                      {badge.claimed
                        ? "MINTED"
                        : badge.claimable
                          ? "READY TO CLAIM"
                          : badge.eligible
                            ? "ELIGIBLE"
                            : "IN PROGRESS"}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--fg)]">{badge.name}</h3>
                  </div>
                  <div
                    className="h-12 w-12 rounded-xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${badge.accent} 0%, rgba(8,15,30,0.9) 100%)`,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm text-[var(--fg-dim)]">{badge.description}</p>
                <p className="mt-3 text-xs font-mono tracking-[0.08em] text-[var(--fg-dim)]">
                  {badge.short_rule}
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[0.7rem] font-mono text-[var(--fg-dim)]">
                    <span>PROGRESS</span>
                    <span>
                      {badge.progress}/{badge.target}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (badge.progress / badge.target) * 100)}%`,
                        background: badge.accent,
                      }}
                    />
                  </div>
                </div>

                {badge.claimed && badge.mint_address && badge.tx_signature && (
                  <div className="mt-4 space-y-2 text-[0.7rem] font-mono text-[var(--fg-dim)]">
                    <a
                      href={explorerTokenLink(badge.mint_address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block underline hover:opacity-80"
                    >
                      Mint: {badge.mint_address.slice(0, 16)}…{badge.mint_address.slice(-8)}
                    </a>
                    <a
                      href={explorerTxLink(badge.tx_signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block underline hover:opacity-80"
                    >
                      Tx: {badge.tx_signature.slice(0, 16)}…{badge.tx_signature.slice(-8)}
                    </a>
                  </div>
                )}

                <button
                  onClick={() => claimBadge(badge.id)}
                  disabled={!badge.claimable || badgeActionId === badge.id}
                  className="cta mt-5 w-full py-3 text-xs font-mono tracking-[0.14em] disabled:opacity-40"
                >
                  {badge.claimed
                    ? "BADGE MINTED"
                    : badgeActionId === badge.id
                      ? "MINTING BADGE…"
                      : badge.claimable
                        ? "CLAIM NFT BADGE"
                        : "MILESTONE LOCKED"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function recoverDuplicateSubmission(
  error: unknown,
  connection: Connection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any,
  proofPda: PublicKey,
): Promise<string | null> {
  if (!(error instanceof SendTransactionError)) {
    return null;
  }

  const message = error.message.toLowerCase();
  if (!message.includes("already been processed")) {
    return null;
  }

  try {
    await accounts.trainingProof.fetch(proofPda);
  } catch {
    return null;
  }

  try {
    const logs = await error.getLogs(connection);
    console.info("Recovered duplicate Solana submission.", logs);
  } catch {
    // Best-effort log fetch only.
  }

  try {
    const signatures = await connection.getSignaturesForAddress(proofPda, { limit: 1 });
    return signatures[0]?.signature ?? null;
  } catch {
    return null;
  }
}
