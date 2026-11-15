import type { Metadata } from "next";
import { Funnel_Display, Geist_Mono, Hedvig_Letters_Sans } from "next/font/google";
import "./globals.css";

// Hedvig Letters Sans for text, Funnel Display for headings.
// Hedvig Letters Sans ships one weight (400) and no italic, so medium and bold text are synthesised by the browser.
const sans = Hedvig_Letters_Sans({ variable: "--font-hedvig", subsets: ["latin"], weight: "400" });
const display = Funnel_Display({ variable: "--font-funnel", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Campaign Academy",
  description: "Run a campaign. Thirty days. One city.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
