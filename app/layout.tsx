import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AthleteTwin — Train smarter by testing your future first",
  description:
    "A digital twin of your athletic performance. Camera-based form analysis + 14-day projection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
