import HeroScene from "@/components/hero/HeroScene";
import { HeroOverlay } from "@/components/HeroOverlay";

export default function Home() {
  return (
    <main className="relative noise min-h-screen overflow-hidden bg-[var(--bg)]">
      <HeroScene />
      <HeroOverlay />
    </main>
  );
}
