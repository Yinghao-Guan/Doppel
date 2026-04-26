"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccentSelector } from "@/components/AccentSelector";
import { useTransitionNavigate } from "@/lib/page-transition";

const NAV_ITEMS: { label: string; href: string; matchPath: string }[] = [
  { label: "CAPTURE", href: "/?step=capture", matchPath: "/" },
  { label: "TWIN", href: "/twin", matchPath: "/twin" },
];

type TopNavProps = { hideBrand?: boolean; hideNav?: boolean };

export function TopNav(props: TopNavProps) {
  return (
    <Suspense
      fallback={<TopNavFrame {...props} active={null} navigate={null} />}
    >
      <TopNavInner {...props} />
    </Suspense>
  );
}

function TopNavInner({ hideBrand = false, hideNav = false }: TopNavProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const navigate = useTransitionNavigate();

  const activeFor = (matchPath: string) => {
    if (matchPath === "/") {
      return pathname === "/" && search.get("step") === "capture";
    }
    return pathname?.startsWith(matchPath) ?? false;
  };

  return (
    <TopNavFrame
      hideBrand={hideBrand}
      hideNav={hideNav}
      active={activeFor}
      navigate={navigate}
    />
  );
}

function TopNavFrame({
  hideBrand,
  hideNav,
  active,
  navigate,
}: TopNavProps & {
  active: ((matchPath: string) => boolean) | null;
  navigate: ((href: string) => void) | null;
}) {
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
            <span className="brand-shimmer font-display text-2xl font-medium tracking-[-0.04em] transition-opacity group-hover:opacity-80">
              doppel
            </span>
          </Link>
        )}
      </div>

      <nav className="hidden items-center gap-8 md:flex">
        {!hideNav &&
          NAV_ITEMS.map((item) => {
            const isActive = active ? active(item.matchPath) : false;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (!navigate) return;
                  e.preventDefault();
                  navigate(item.href);
                }}
                className={cn(
                  "relative font-mono text-xs tracking-[0.2em] transition-colors py-1 cursor-pointer",
                  isActive
                    ? "text-[var(--fg)]"
                    : "text-[var(--fg-dim)] hover:text-[var(--fg)]",
                )}
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                )}
              </a>
            );
          })}
      </nav>

      <div className="cta glass cta-ghost text-xs font-mono tracking-[0.2em] py-2 px-4">
        BRONCOHACKS&apos;26
      </div>
    </header>
  );
}
