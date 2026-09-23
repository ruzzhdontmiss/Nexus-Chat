import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { GeistPixelGrid } from "geist/font/pixel";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Nexus",
  description: "A fast, polished, multi-model AI workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${GeistPixelGrid.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <TooltipProvider delay={0}>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
