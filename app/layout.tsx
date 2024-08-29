import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ContextProvider } from "@/contexts/ContextProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RaffleBags",
  description: "Join the Ultimate Raffle: Bigger Prizes with Every Win - $1 USDC on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ContextProvider>{children}</ContextProvider>
      </body>
    </html>
  );
}
