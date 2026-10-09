"use client";

import { Sidebar } from "./sidebar";
import { NexusBackground } from "@/components/backgrounds/NexusBackground";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Welcome back");

  const handleLoginClick = () => {
    setAuthModalTitle("Welcome back");
    setAuthModalOpen(true);
  };

  const handleSignUpClick = () => {
    setAuthModalTitle("Create your Nexus account");
    setAuthModalOpen(true);
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background selection:bg-primary/20">
      <div className="relative z-20">
        <Sidebar />
      </div>

      <main className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden border-l bg-transparent">
        <NexusBackground />

        {/* Guest Header */}
        {status === "unauthenticated" && (
          <div className="absolute top-0 right-0 z-30 p-4 flex items-center gap-3 animate-in fade-in duration-500">
            <button
              onClick={handleLoginClick}
              className="text-sm font-medium text-foreground/80 hover:text-foreground px-4 py-2 rounded-md hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              Log in
            </button>
            <button
              onClick={handleSignUpClick}
              className="text-sm font-medium bg-foreground text-background hover:bg-foreground/90 px-4 py-2 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              Sign up for free
            </button>
          </div>
        )}

        <div className="relative z-10 flex h-full flex-1 flex-col">
          {children}
        </div>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authModalTitle}
      />
    </div>
  );
}