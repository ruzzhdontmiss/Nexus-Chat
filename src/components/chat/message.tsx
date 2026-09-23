"use client";

import { cn } from "@/lib/utils";
import { SparklesIcon, UserIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ThinkingOrb } from "thinking-orbs";
import { GenerationState } from "./chat-interface";

export type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface MessageProps {
  message: MessageType;
  generationState?: GenerationState;
}

export function Message({ message, generationState = "idle" }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 shrink-0 bg-muted rounded-lg flex items-center justify-center ring-1 ring-border/50 mt-1">
          <SparklesIcon className="h-4 w-4 text-foreground/80" />
        </div>
      )}
      
      <div className={cn(
        "px-4 py-3 rounded-3xl max-w-[85%] whitespace-pre-wrap leading-relaxed",
        isUser 
          ? "bg-muted/40 text-foreground rounded-tr-sm border border-border/30" 
          : "bg-transparent text-foreground"
      )}>
        {!isUser ? (
          <div className="[&>p]:mb-4 [&>p:last-child]:mb-0 [&>pre]:my-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-4">
            {message.content === "" && generationState === "requesting" ? (
              <div className="flex items-center gap-3 text-muted-foreground/80 animate-in fade-in duration-500 py-1">
                <ThinkingOrb state="working" size={20} theme="dark" aria-label="Nexus is thinking" />
              </div>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-xl border border-border/30 !my-4 shadow-sm text-sm"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...props} className={cn(className, "bg-muted/50 text-foreground rounded-md px-1.5 py-0.5 font-mono text-sm border border-border/30")}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        ) : (
          message.content
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 shrink-0 bg-muted rounded-full flex items-center justify-center ring-1 ring-border/50 mt-1">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
