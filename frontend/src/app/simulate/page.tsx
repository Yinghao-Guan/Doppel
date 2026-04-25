import { PageShell } from "@/components/PageShell";
import { SimulatePanel } from "@/components/simulate/SimulatePanel";

export const metadata = {
  title: "Simulate · doppel",
};

export default function SimulatePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-3">Step 03 · What-if engine</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Test three futures <span className="text-[var(--accent-cyan)]">side by side.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Adjust frequency, intensity, and exercise mix. The twin re-simulates
          your 14-day outcome instantly so you pick the path before you commit.
        </p>

        <SimulatePanel />
      </div>
    </PageShell>
  );
}
