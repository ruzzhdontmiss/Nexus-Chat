"use client";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background relative border-l">
        {/* Subtle radial gradient for premium feel */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/30 via-background to-background" />
        <div className="relative flex-1 flex flex-col h-full z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
