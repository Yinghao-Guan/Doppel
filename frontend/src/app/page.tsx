import { Suspense } from "react";
import { LandingShell } from "@/components/LandingShell";

export const metadata = {
  title: "doppel",
};

export default function Home() {
  return (
    <main className="relative noise min-h-screen overflow-hidden flex flex-col">
      <Suspense fallback={null}>
        <LandingShell />
      </Suspense>
    </main>
  );
}
