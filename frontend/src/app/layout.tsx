import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AccentProvider } from "@/components/AccentProvider";
import { ProfileProvider } from "@/lib/profile-store";
import PersistentBackdropMount from "@/components/PersistentBackdropMount";
import { WalletProviderClient } from "@/components/WalletProviderClient";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

export const metadata: Metadata = {
  title: "doppel — Train smarter by testing your future first",
  description:
    "Doppel builds an AI digital twin of your athletic performance. Real-time pose CV plus predictive modeling shows how you'll perform 14 days from now — before you train.",
};

const FONT_VARS = {
  "--font-display": '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
  "--font-body": '"Avenir Next", "Segoe UI", system-ui, sans-serif',
  "--font-mono": '"SFMono-Regular", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
} as CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={FONT_VARS}
    >
      <body className="min-h-full">
        <AccentProvider>
          <ProfileProvider>
            <WalletProviderClient>
              <PersistentBackdropMount />
              {children}
              <SplashScreen />
            </WalletProviderClient>
          </ProfileProvider>
        </AccentProvider>
      </body>
    </html>
  );
}
