import { HeroOverlay } from "@/components/HeroOverlay";
import { TopNav } from "@/components/TopNav";

export const metadata = {
  title: "doppel",
};

export default function Home() {
  return (
    <main className="relative noise min-h-screen overflow-hidden flex flex-col">
      <TopNav hideBrand hideNav />
      <HeroOverlay />
    </main>
  );
}
