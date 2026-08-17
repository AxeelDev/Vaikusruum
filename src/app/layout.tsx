import type { Metadata } from "next";
import { Bodoni_Moda, Cormorant_Garamond, EB_Garamond, Lato, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bodoni",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vaikusruum",
    template: "%s · Vaikusruum",
  },
  description: "Vaikusruum on kutse aeglustuda, hingata ja olla.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="et"
      className={`${cormorant.variable} ${ebGaramond.variable} ${bodoni.variable} ${sourceSans.variable} ${lato.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
