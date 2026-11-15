import type { Metadata } from "next";
import { Anton, Funnel_Display, Geist_Mono, Hedvig_Letters_Sans, Playfair_Display, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Hedvig Letters Sans for text, Funnel Display for headings.
// Hedvig Letters Sans ships one weight (400) and no italic, so medium and bold text are synthesised by the browser.
const sans = Hedvig_Letters_Sans({ variable: "--font-hedvig", subsets: ["latin"], weight: "400" });
const display = Funnel_Display({ variable: "--font-funnel", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// The morning paper only: a condensed wood-type face for its headline, a heavy serif for the masthead, a sturdy serif for its text.
const headline = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400", preload: false });
const masthead = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], preload: false });
const print = Source_Serif_4({ variable: "--font-sourceserif", subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], preload: false });

export const metadata: Metadata = {
  title: "Campaign Academy",
  description: "Run a campaign. Thirty days. One city.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} ${headline.variable} ${masthead.variable} ${print.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
