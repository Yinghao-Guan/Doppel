import { PageShell } from "@/components/PageShell";
import { WhatIfPanel } from "@/components/whatif/WhatIfPanel";

export const metadata = {
  title: "What-If · doppel",
};

export default function WhatIfPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-3">Step 04 · Coach narrative</p>
        <h1 className="headline text-3xl text-[var(--fg)] sm:text-4xl md:text-5xl">
          Tweak one knob, hear the{" "}
          <span className="text-[var(--accent)]">why.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--fg-dim)]">
          Move the sliders to imagine a different plan. The twin re-scores the
          14-day outlook and Gemini explains the trade-offs in plain language.
        </p>

        <WhatIfPanel />
      </div>
    </PageShell>
  );
}
