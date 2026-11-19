import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestion des patients | EJ Logiciel",
  description: "Système de gestion de patient — Cabinet Médical",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col font-sans ${plexSans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
