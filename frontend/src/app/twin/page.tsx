import { PageShell } from "@/components/PageShell";
import { ReadinessView } from "@/components/readiness/ReadinessView";

export const metadata = {
  title: "Twin · doppel",
};

export default function TwinPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1800px]">
        <p className="eyebrow mb-3">Step 02 · Twin</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Meet your <span className="brand-shimmer">twin.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Your profile and last capture, run through the model. Toggle between
          <span className="font-mono"> Now</span> and
          <span className="font-mono"> What if</span> to see today&apos;s
          readout or simulate a different training plan &mdash; same chart,
          hypothetical inputs.
        </p>

        <ReadinessView />
      </div>
    </PageShell>
  );
}
