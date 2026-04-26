import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import { AccentProvider } from "@/components/AccentProvider";
import { ProfileProvider } from "@/lib/profile-store";
import PersistentBackdropMount from "@/components/PersistentBackdropMount";
import { WalletProviderClient } from "@/components/WalletProviderClient";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the nonce from the request headers signals Next.js to apply it to
  // its server-rendered inline scripts under the strict CSP set in middleware.ts.
  await headers();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
