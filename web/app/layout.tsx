import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Il Catalogo", template: "%s · Il Catalogo" },
  description: "A personal catalogue of every album listened, rated and scrobbled.",
};

export const viewport: Viewport = { themeColor: "#05050a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://lastfm-img.freetls.fastly.net" />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
      </head>
      <body className="font-sans">
        <MotionProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-28 sm:px-6 lg:px-10">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}

