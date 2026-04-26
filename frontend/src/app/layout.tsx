import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import { AccentProvider } from "@/components/AccentProvider";
import { ProfileProvider } from "@/lib/profile-store";
import PersistentBackdropMount from "@/components/PersistentBackdropMount";
import dynamic from "next/dynamic";
import "./globals.css";

const WalletProvider = dynamic(
  () => import("@/components/WalletProvider").then((m) => m.WalletProvider),
  { ssr: false }
);

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "doppel — Train smarter by testing your future first",
  description:
    "Doppel builds an AI digital twin of your athletic performance. Real-time pose CV plus predictive modeling shows how you'll perform 14 days from now — before you train.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AccentProvider>
          <ProfileProvider>
            <WalletProvider>
              <PersistentBackdropMount />
              {children}
            </WalletProvider>
          </ProfileProvider>
        </AccentProvider>
      </body>
    </html>
  );
}
