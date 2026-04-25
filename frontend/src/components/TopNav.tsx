"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccentSelector } from "@/components/AccentSelector";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "CAPTURE", href: "/capture" },
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "SIMULATE", href: "/simulate" },
  { label: "WHAT-IF", href: "/what-if" },
];

export function TopNav({ hideBrand = false }: { hideBrand?: boolean }) {
  const pathname = usePathname();

  return (
    <header
      className="relative z-20 flex items-center justify-between px-8 py-6 md:px-14"
      style={{
        background:
          "linear-gradient(to bottom, rgba(9,9,11,0.6) 0%, rgba(9,9,11,0) 100%)",
      }}
    >
      <div className="flex items-center gap-4">
        <AccentSelector />
        {!hideBrand && (
          <Link href="/" className="group inline-flex items-baseline">
            <span
              className="font-display text-2xl font-medium tracking-[-0.04em] transition-opacity group-hover:opacity-80"
              style={{
                backgroundImage:
                  "linear-gradient(135deg,var(--accent-cyan) 0%,#ffffff 50%,var(--accent) 75%,var(--accent-deep) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              doppel
            </span>
          </Link>
        )}
      </div>

      <nav className="hidden items-center gap-8 md:flex">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative font-mono text-xs tracking-[0.2em] transition-colors py-1",
                active
                  ? "text-[var(--fg)]"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)]",
              )}
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
            >
              {item.label}
              {active && (
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4">
        BRONCOHACKS&apos;26
      </div>
    </header>
  );
}
