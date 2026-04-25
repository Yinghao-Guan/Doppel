import { PageShell } from "@/components/PageShell";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Dashboard · doppel",
};

export default function DashboardPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1800px]">
        <p className="eyebrow mb-3">Step 02 · Forecast</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Your twin in <span className="brand-shimmer">14 days.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          A holistic projection from your training fingerprint &mdash; not a
          guess at your max lift, but where your readiness is heading.
        </p>

        <DashboardGrid />
      </div>
    </PageShell>
  );
}
