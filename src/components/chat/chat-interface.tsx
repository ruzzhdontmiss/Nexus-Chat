"use client";

import { useState } from "react";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { MessageType, SourceReference } from "./message";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { ThinkingOrb } from "thinking-orbs";

export type GenerationState = "idle" | "searching" | "requesting" | "streaming" | "complete" | "error" | "cancelled";

interface ChatInterfaceProps {
  initialConversationId?: string;
  initialMessages?: MessageType[];
}

const SUGGESTIONS = [
  "Plan a better workflow",
  "Explain something I'm stuck on",
  "Turn an idea into a project",
  "Review some code"
];

export function ChatInterface({ initialConversationId, initialMessages = [] }: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [input, setInput] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [selectedModelId, setSelectedModelId] = useState(AVAILABLE_MODELS[0].id);
  const [searchEnabled, setSearchEnabled] = useState(false);

  const isGenerating = generationState === "requesting" || generationState === "streaming" || generationState === "searching";

  const handleSubmit = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // If search is enabled, show "searching" state first
    setGenerationState(searchEnabled ? "searching" : "requesting");

    let currentConversationId = conversationId;
    if (!currentConversationId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          currentConversationId = data.conversation.id;
          setConversationId(currentConversationId);
          window.history.replaceState(null, '', `/chat/${currentConversationId}`);
        }
      } catch (err) {
        console.error("Failed to create conversation", err);
      }
    }

    const assistantMessageId = (Date.now() + 1).toString();

    // Add empty assistant message immediately for optimistic UI
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModelId,
          messages: [...messages, userMessage],
          conversationId: currentConversationId,
          search: searchEnabled,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to generate");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirstChunk = true;
      let buffer = "";
      let sourcesParsed = false;
      let streamedSources: SourceReference[] = [];

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });

        if (chunkValue) {
          buffer += chunkValue;

          // If search is disabled, we don't expect a sources header.
          if (!searchEnabled) {
            sourcesParsed = true;
          }

          // On first data, check for sources metadata header
          if (!sourcesParsed) {
            const newlineIdx = buffer.indexOf("\n");
            if (newlineIdx !== -1) {
              const firstLine = buffer.slice(0, newlineIdx);
              try {
                const meta = JSON.parse(firstLine);
                if (meta.type === "sources" && Array.isArray(meta.sources)) {
                  streamedSources = meta.sources;
                  // Attach sources to the assistant message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, sources: streamedSources }
                        : msg
                    )
                  );
                  // Remove the metadata line from buffer
                  buffer = buffer.slice(newlineIdx + 1);
                }
              } catch {
                // Not JSON — treat entire buffer as text content
              }
              sourcesParsed = true;
            }
          }

          // Stream remaining text if sources have been parsed (or skipped)
          if (sourcesParsed && buffer) {
            if (isFirstChunk) {
              setGenerationState("streaming");
              isFirstChunk = false;
            }
            const appendText = buffer;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + appendText }
                  : msg
              )
            );
            buffer = "";
          }
        }
      }

      // Flush any remaining buffer
      if (buffer) {
        const finalAppend = buffer;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + finalAppend }
              : msg
          )
        );
      }
    } catch (error) {
      console.error(error);
      setGenerationState("error");
    } finally {
      setGenerationState((prev) => (prev === "streaming" || prev === "requesting" || prev === "searching" ? "complete" : prev));
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-transparent">

      {/* Active Conversation Layout */}
      {messages.length > 0 ? (
        <>
          <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-500">
            <MessageList messages={messages} generationState={generationState} />
          </div>
          <div className="shrink-0 pb-6 pt-2 bg-background/80 backdrop-blur-md w-full max-w-3xl mx-auto px-4">
            <MessageComposer
              input={input}
              setInput={setInput}
              isGenerating={isGenerating}
              onSubmit={handleSubmit}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              searchEnabled={searchEnabled}
              onToggleSearch={setSearchEnabled}
            />
          </div>
        </>
      ) : (
        /* Empty State Centered Layout */
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4 gap-8">
          <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-1000">
            <ThinkingOrb state="composing" size={64} theme="dark" />
            <div className="space-y-2">
              <h1 className="text-4xl font-display font-medium tracking-tight text-foreground">
                What are you working on?
              </h1>
              <p className="text-muted-foreground">
                A quieter space to think, build, and make progress.
              </p>
            </div>
          </div>

          <div className="w-full relative z-20">
            <MessageComposer
              input={input}
              setInput={setInput}
              isGenerating={isGenerating}
              onSubmit={handleSubmit}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              searchEnabled={searchEnabled}
              onToggleSearch={setSearchEnabled}
            />

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150 fill-mode-both">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-full bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground text-sm font-medium transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
