import HeroScene from "@/components/hero/HeroScene";
import { HeroOverlay } from "@/components/HeroOverlay";
import { TopNav } from "@/components/TopNav";

export default function Home() {
  return (
    <main className="relative noise min-h-screen overflow-hidden bg-[var(--bg)] flex flex-col">
      <HeroScene />
      <TopNav hideBrand />
      <HeroOverlay />
    </main>
  );
}
