"use client";

import { PlusIcon, MessageSquareIcon, SettingsIcon, PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<{ id: string, title: string }[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/conversations")
        .then(res => res.json())
        .then(data => {
          if (data.conversations) setConversations(data.conversations);
        })
        .catch(console.error);
    } else {
      setConversations([]);
    }
  }, [pathname, session]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      <div className={cn("flex items-center p-3 h-14", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <span className="font-display font-normal text-[20px] pl-2 tracking-wide">Nexus</span>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
          <PanelLeftIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-4">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={
              <Link href="/" className="flex items-center justify-center w-full h-10 border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors">
                <PlusIcon className="h-4 w-4" />
              </Link>
            } />
            <TooltipContent side="right">New Chat</TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/" className="flex items-center w-full justify-start gap-2 h-10 px-3 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 rounded-md transition-colors text-sm font-medium">
            <PlusIcon className="h-4 w-4" />
            <span>New Chat</span>
          </Link>
        )}
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {conversations.map((conv) => (
            collapsed ? (
              <Tooltip key={conv.id}>
                <TooltipTrigger render={
                  <Link href={`/chat/${conv.id}`} className={cn("flex items-center justify-center h-10 w-full rounded-md hover:bg-sidebar-accent transition-colors", pathname === `/chat/${conv.id}` ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground")}>
                    <MessageSquareIcon className="h-4 w-4" />
                  </Link>
                } />
                <TooltipContent side="right">{conv.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={conv.id} href={`/chat/${conv.id}`} className={cn("flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-colors", pathname === `/chat/${conv.id}` ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground")}>
                <MessageSquareIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title || "New Conversation"}</span>
              </Link>
            )
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 mt-auto border-t border-sidebar-border/50">
        {!session ? (
          <Button 
            variant="ghost" 
            className={cn("w-full hover:text-sidebar-accent-foreground hover:bg-sidebar-accent", collapsed ? "justify-center h-10 px-0" : "justify-start gap-3 h-10 text-sidebar-foreground/70")}
            onClick={() => signIn("google")}
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign In</span>}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            className={cn("w-full hover:text-sidebar-accent-foreground hover:bg-sidebar-accent", collapsed ? "justify-center h-10 px-0" : "justify-start gap-3 h-10 text-sidebar-foreground/70")}
            onClick={() => signOut()}
          >
            {/* Can use Avatar later, keeping it simple for now */}
            <div className="h-5 w-5 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-[10px] font-bold text-primary">
              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <span className="truncate flex-1 text-left text-xs">
                Sign Out
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
