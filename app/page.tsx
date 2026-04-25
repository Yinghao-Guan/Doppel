"use client";

/**
 * PERSON 3 — main dashboard page. Composes every other team member's component.
 *
 * Layout:
 *   [Header]
 *   [Profile][   Camera Feed   ][Fingerprint]
 *   [        ProjectionCard           ][Radar]
 *   [    PlanCompare    ][ WhatIfSliders ]
 *   [          GrowthCurve              ]
 */

import dynamic from "next/dynamic";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { FingerprintCard } from "@/components/dashboard/FingerprintCard";
import { ProjectionCard } from "@/components/dashboard/ProjectionCard";
import { RadarChart } from "@/components/dashboard/RadarChart";
import { PlanCompare } from "@/components/simulator/PlanCompare";
import { WhatIfSliders } from "@/components/simulator/WhatIfSliders";
import { GrowthCurve } from "@/components/simulator/GrowthCurve";

// MediaPipe needs the browser — never SSR.
const PoseCamera = dynamic(
  () => import("@/components/camera/PoseCamera").then((m) => m.PoseCamera),
  { ssr: false }
);

export default function Page() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
              BroncoHacks 2026
            </span>
          </div>
          <h1 className="mt-2 text-4xl lg:text-5xl font-bold tracking-tight">
            AthleteTwin
          </h1>
          <p className="mt-1 text-muted text-sm lg:text-base">
            Train smarter by testing your future first.
          </p>
        </div>
      </header>

      {/* Row 1: profile + camera + fingerprint */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3"><ProfileForm /></div>
        <div className="lg:col-span-6"><PoseCamera /></div>
        <div className="lg:col-span-3"><FingerprintCard /></div>
      </section>

      {/* Row 2: projection + radar */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-8"><ProjectionCard /></div>
        <div className="lg:col-span-4"><RadarChart /></div>
      </section>

      {/* Row 3: plan compare + what-if */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-8"><PlanCompare /></div>
        <div className="lg:col-span-4"><WhatIfSliders /></div>
      </section>

      {/* Row 4: growth curve */}
      <section className="mt-4">
        <GrowthCurve />
      </section>

      <footer className="mt-10 text-center text-xs text-muted">
        Built in 24 hours at BroncoHacks 2026 · Sports & Fitness · Best Use of AI/ML
      </footer>
    </main>
  );
}
