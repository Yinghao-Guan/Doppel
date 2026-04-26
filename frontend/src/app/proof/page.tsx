import { PageShell } from "@/components/PageShell";
import { ProofPanel } from "@/components/proof/ProofPanel";

export const metadata = {
  title: "Proof · doppel",
};

export default function ProofPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1800px]">
        <p className="eyebrow mb-3">Step 03 · Onchain</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Prove your training <span className="brand-shimmer">onchain.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Submit a tamper-proof record of your workout to Solana devnet. Your
          form score and rep count are hashed and stored permanently.
        </p>
        <ProofPanel />
      </div>
    </PageShell>
  );
}
