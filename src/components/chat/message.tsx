"use client";

import { cn } from "@/lib/utils";
import { SparklesIcon, UserIcon, GlobeIcon, ExternalLinkIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ThinkingOrb } from "thinking-orbs";
import { GenerationState } from "./chat-interface";

export type SourceReference = {
  id: string;
  title: string;
  url: string;
  domain?: string;
};

export type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
};

interface MessageProps {
  message: MessageType;
  generationState?: GenerationState;
}

function SourceCard({ source }: { source: SourceReference }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all duration-200"
    >
      <div className="h-5 w-5 shrink-0 rounded bg-muted/50 flex items-center justify-center mt-0.5">
        <GlobeIcon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground/90 truncate leading-tight group-hover:text-foreground transition-colors">
          {source.title}
        </div>
        <div className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
          {source.domain || source.url}
        </div>
      </div>
      <ExternalLinkIcon className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
    </a>
  );
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
            {message.content === "" && (generationState === "requesting" || generationState === "searching" || generationState === "streaming") ? (
              <div className="flex items-center gap-3 text-muted-foreground/80 animate-in fade-in duration-500 py-1">
                <ThinkingOrb state="working" size={20} theme="dark" aria-label={generationState === "searching" ? "Searching the web" : "Nexus is thinking"} />
                {generationState === "searching" && (
                  <span className="text-xs text-muted-foreground/60 animate-in fade-in duration-300">Searching the web…</span>
                )}
              </div>
            ) : (
              <>
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

                {/* Sources section */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/20 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold flex items-center gap-1.5">
                      <GlobeIcon className="h-3 w-3" />
                      Sources
                    </div>
                    <div className="grid gap-1.5">
                      {message.sources.map((source) => (
                        <SourceCard key={source.id} source={source} />
                      ))}
                    </div>
                  </div>
                )}
              </>
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
