import { PageShell } from "@/components/PageShell";
import { CapturePanel } from "@/components/capture/CapturePanel";

export const metadata = {
  title: "Capture · doppel",
};

export default function CapturePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1800px]">
        <p className="eyebrow mb-3">Step 01 · Pose CV</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Show your twin <span className="brand-shimmer">how you train.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Stand in frame and run through 5&ndash;10 reps. We&apos;ll extract
          form, tempo, range of motion, and fatigue trends in real time.
        </p>

        <CapturePanel />
      </div>
    </PageShell>
  );
}
