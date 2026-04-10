import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TooltipProvider } from "@/components/ui/tooltip";

import type { Metadata } from "next";

import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 写作助手",
  description: "由 Next.js 驱动的智能写作助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <TooltipProvider>
            <main className="w-screen h-screen overflow-x-hidden overflow-y-auto">
              {children}
            </main>
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
