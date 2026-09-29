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
};

interface MessageProps {
  message: MessageType;
  generationState?: GenerationState;
}

function SourceCard({ source }: { source: SourceReference }) {
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
    <div className="flex flex-col border border-border/40 rounded-xl overflow-hidden bg-muted/10 hover:bg-muted/20 hover:border-border/60 transition-all duration-200">
      <Wrapper
        {...wrapperProps}
        className={cn(
          "group flex items-start gap-3 px-3.5 py-3 w-full text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          isDoc && !source.snippet ? "cursor-default" : "cursor-pointer"
        )}
      >
        <div className="h-6 w-6 shrink-0 rounded-md bg-muted flex items-center justify-center mt-0.5 border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors">
          {isDoc ? <FileIcon className="h-3.5 w-3.5" /> : <GlobeIcon className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-sm font-medium text-foreground/90 truncate leading-tight group-hover:text-foreground transition-colors">
            {source.title}
          </div>
          <div className="text-[11px] text-muted-foreground/70 truncate mt-1 flex items-center gap-1.5">
            {isDoc ? (
              <>
                {source.page && <span className="font-medium text-muted-foreground/80">Page {source.page}</span>}
                {source.page && source.section && <span className="opacity-50">&bull;</span>}
                {source.section && <span>{source.section}</span>}
                {!source.page && !source.section && <span>Document Extract</span>}
              </>
            ) : (
              source.domain || source.url
            )}
          </div>
        </div>
        {isDoc && source.snippet ? (
          <ChevronDownIcon className={cn("h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-200 mt-1", expanded ? "rotate-180 text-foreground" : "group-hover:text-foreground")} />
        ) : !isDoc && (
          <ExternalLinkIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        )}
      </Wrapper>
      
      {isDoc && expanded && source.snippet && (
        <div className="px-4 pb-4 pt-2 border-t border-border/20 bg-muted/20 animate-in slide-in-from-top-1 fade-in duration-200">
          <div className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 stylish-scrollbar font-normal">
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
    <div className={cn("flex w-full gap-3 group/message", isUser ? "justify-end" : "justify-start")}>
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
        "min-w-0 max-w-[85%] whitespace-pre-wrap leading-relaxed",
        isUser 
          ? "bg-muted/40 text-foreground px-4 py-3 rounded-3xl rounded-tr-sm border border-border/30" 
          : "bg-transparent text-foreground py-1"
      )}>
        {!isUser ? (
          <div className="[&>p]:mb-4 [&>p:last-child]:mb-0 [&>pre]:my-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:mb-4 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-3 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-2 [&>h4]:text-sm [&>h4]:font-semibold [&>h4]:mb-2">
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

                <div className="opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100 transition-opacity duration-200">
                  <MessageActions content={message.content} />
                </div>
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
});
