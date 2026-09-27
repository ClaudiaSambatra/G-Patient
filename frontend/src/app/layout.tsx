import type { Metadata } from "next";
import { IBM_Plex_Sans, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Gestion de Patients",
  description: "Application de gestion de patients — Backend Django, Frontend Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col font-sans ${ibmPlexSans.variable} ${geist.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
