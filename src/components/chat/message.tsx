"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { UserIcon, GlobeIcon, ExternalLinkIcon, FileIcon, ChevronDownIcon, CopyIcon, CheckIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ThinkingOrb } from "thinking-orbs";
import { GenerationState } from "./chat-interface";

export type SourceReference = {
  id: string;
  type?: "web" | "document";
  title: string;
  url?: string;
  domain?: string;
  page?: number;
  section?: string;
  snippet?: string;
  chunkId?: string;
};

export type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  attachments?: { id: string; name: string }[];
};

interface MessageProps {
  message: MessageType;
  generationState?: GenerationState;
}

function SourceChip({ source }: { source: SourceReference }) {
  const [expanded, setExpanded] = useState(false);
  const isDoc = source.type === "document";

  const toggleExpand = (e: React.MouseEvent) => {
    if (isDoc && source.snippet) {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };

  const Wrapper = isDoc && source.snippet ? "button" : isDoc ? "div" : "a";
  const wrapperProps = isDoc && source.snippet
    ? { onClick: toggleExpand, type: "button" as const, "aria-expanded": expanded }
    : !isDoc ? { href: source.url, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <div className="relative inline-flex flex-col group/chip">
      <Wrapper
        {...wrapperProps}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all text-[11px] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          isDoc && !source.snippet ? "cursor-default" : "cursor-pointer"
        )}
      >
        {isDoc ? <FileIcon className="h-3 w-3 text-muted-foreground" /> : <GlobeIcon className="h-3 w-3 text-muted-foreground" />}
        <span className="font-medium text-muted-foreground max-w-[120px] truncate">{source.title}</span>
        {isDoc && source.page && (
          <span className="text-muted-foreground/70 ml-0.5 whitespace-nowrap">p.{source.page}</span>
        )}
      </Wrapper>

      {isDoc && expanded && source.snippet && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-200 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground truncate pr-2">{source.title}</span>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(false); }} className="text-muted-foreground/60 hover:text-foreground shrink-0">
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto stylish-scrollbar font-normal">
            {source.snippet}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-1">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="Copy response"
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

export const Message = React.memo(function Message({ message, generationState = "idle" }: MessageProps) {
  const isUser = message.role === "user";
  const isGenerating = !isUser && (generationState === "requesting" || generationState === "streaming" || generationState === "searching");

  return (
    <div id={`message-${message.id}`} className={cn("flex w-full gap-3 group/message", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="shrink-0 flex flex-col items-center pt-[6px]">
          <ThinkingOrb
            state={isGenerating ? "working" : "breathing"}
            size={20}
            theme="dark"
            aria-label={isGenerating ? "Nexus is thinking" : "Nexus"}
          />
        </div>
      )}

      <div className={cn(
        "min-w-0 max-w-[85%] whitespace-pre-wrap leading-relaxed flex flex-col",
        isUser
          ? "bg-muted/40 text-foreground px-4 py-3 rounded-3xl rounded-tr-sm border border-border/30"
          : "bg-transparent text-foreground py-1"
      )}>
        {!isUser ? (
          <div className="[&>p]:mb-4 [&>p:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-2 [&_li>p]:m-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_pre]:my-4">
            {message.content === "" && isGenerating ? (
              <div className="flex items-center gap-3 text-muted-foreground/80 animate-in fade-in duration-500 py-1">
                {generationState === "searching" ? (
                  <span className="text-sm text-muted-foreground/70 animate-in fade-in duration-300">Searching the web…</span>
                ) : (
                  <span className="text-sm text-muted-foreground/70 animate-in fade-in duration-300">Thinking…</span>
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
                  {message.content.replace(/\[[^\]]+†[^\]]+\]/g, "")}
                </ReactMarkdown>

                {/* Sources section */}
                {message.sources && message.sources.length > 0 && (() => {
                  const uniqueSources = message.sources.filter((s, i, a) =>
                    a.findIndex(s2 => s2.title === s.title && s2.page === s.page && s2.type === s.type) === i
                  );
                  return (
                    <div className="mt-4 pt-3 border-t border-border/20 flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {uniqueSources.map((source, i) => (
                        <SourceChip key={source.id || i} source={source} />
                      ))}
                    </div>
                  );
                })()}

                <div className="opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100 transition-opacity duration-200">
                  <MessageActions content={message.content.replace(/\[[^\]]+†[^\]]+\]/g, "")} />
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {isUser && message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-1.5 bg-background/50 border border-border/40 rounded-md px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
                    <FileIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                  </div>
                ))}
              </div>
            )}
            {message.content}
          </>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 shrink-0 bg-muted rounded-full flex items-center justify-center ring-1 ring-border/50 mt-1">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
});
