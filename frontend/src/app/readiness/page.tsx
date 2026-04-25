import { PageShell } from "@/components/PageShell";
import { ReadinessView } from "@/components/readiness/ReadinessView";

export const metadata = {
  title: "Readout · doppel",
};

export default function ReadinessPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-3">Step 04 · Readout</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Today&apos;s <span className="text-[var(--accent)]">readout.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Your profile and the last capture, run through the model. Four scores,
          eight signals, and the &ldquo;why&rdquo; behind them — live.
        </p>

        <ReadinessView />
      </div>
    </PageShell>
  );
}
