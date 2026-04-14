import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Gitset v2 | Coming Soon",
  description: "The next generation of Gitset is here. Free initially, Open Source, and BYOAI. Launching June 1st, 2026.",
  icons: {
    icon: "/favicon-192.png",
    apple: "/favicon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased min-h-screen bg-black text-white selection:bg-primary selection:text-white`}
        suppressHydrationWarning
      >
        <div className="glow-blob glow-blob-1 pointer-events-none"></div>
        <div className="glow-blob glow-blob-2 pointer-events-none"></div>
        {children}
      </body>
    </html>
  );
}
