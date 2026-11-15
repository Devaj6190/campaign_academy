import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";

// Public Sans for the interface, Newsreader for headings and reading text. Newsreader's optical-size axis sharpens it at headline sizes.
const sans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ballot to Bill",
  description: "Run a campaign. Thirty days. One city.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
