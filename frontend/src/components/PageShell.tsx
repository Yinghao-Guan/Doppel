import { TopNav } from "@/components/TopNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative noise min-h-screen overflow-hidden bg-[var(--bg)] flex flex-col">
      <AmbientBackdrop />
      <TopNav />
      <div className="relative z-10 flex-1 px-6 pb-16 pt-4 md:px-14">
        {children}
      </div>
    </main>
  );
}

function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[var(--accent-deep)] opacity-25 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-[var(--accent-cyan)] opacity-15 blur-[140px]" />
      <div className="absolute -bottom-40 left-1/3 h-[400px] w-[400px] rounded-full bg-[var(--accent)] opacity-15 blur-[120px]" />
    </div>
  );
}
