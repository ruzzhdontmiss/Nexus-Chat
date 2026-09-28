"use client";

import { Sidebar } from "./sidebar";
import { NexusBackground } from "@/components/backgrounds/NexusBackground";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background selection:bg-primary/20">
      <div className="relative z-20">
        <Sidebar />
      </div>

      <main className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden border-l bg-transparent">
        <NexusBackground />

        <div className="relative z-10 flex h-full flex-1 flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}