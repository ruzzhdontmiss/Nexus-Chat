"use client";

import { useState, useEffect, useRef } from "react";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { MessageType, SourceReference } from "./message";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { ThinkingOrb } from "thinking-orbs";
import { AttachedDocument } from "./document-attachment";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/auth/auth-modal";

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
  const [attachments, setAttachments] = useState<AttachedDocument[]>([]);
  const [conversationDocuments, setConversationDocuments] = useState<string[]>([]);
  const { data: session, status } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Welcome back");

  const lastPropsId = useRef(initialConversationId);

  useEffect(() => {
    if (initialConversationId !== lastPropsId.current) {
      setConversationId(initialConversationId);
      setMessages(initialMessages);
      setGenerationState("idle");
      setConversationDocuments([]);
      lastPropsId.current = initialConversationId;
    }
  }, [initialConversationId, initialMessages]);

  useEffect(() => {
    if (status === "authenticated") {
      const draft = sessionStorage.getItem("nexus_draft_prompt");
      if (draft) {
        setInput(draft);
        sessionStorage.removeItem("nexus_draft_prompt");
      }
    }
  }, [status]);

  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
      setConversationId(undefined);
      setInput("");
      setGenerationState("idle");
      setSearchEnabled(false);
      setAttachments([]);
      setConversationDocuments([]);
      window.history.pushState(null, '', '/');
    };

    window.addEventListener("nexus:new-chat", handleNewChat);
    return () => window.removeEventListener("nexus:new-chat", handleNewChat);
  }, []);

  const isGenerating = generationState === "requesting" || generationState === "streaming" || generationState === "searching";

  const handleSubmit = async () => {
    if (!input.trim() || isGenerating) return;

    if (status === "unauthenticated") {
      sessionStorage.setItem("nexus_draft_prompt", input);
      setAuthModalTitle("Welcome back");
      setAuthModalOpen(true);
      return;
    }
    if (status === "loading") return;

    const currentReadyAttachments = attachments
      .filter(a => a.status === "ready" && a.documentId)
      .map(a => ({ id: a.documentId as string, name: a.name }));

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      attachments: currentReadyAttachments.length > 0 ? currentReadyAttachments : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Persist document attachments for the conversation, then clear from composer
    const currentDocIds = attachments.filter(a => a.status === "ready" && a.documentId).map(a => a.documentId as string);
    setConversationDocuments(prev => {
      const updated = Array.from(new Set([...prev, ...currentDocIds]));
      return updated;
    });
    setAttachments([]);

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
          documentIds: Array.from(new Set([...conversationDocuments, ...currentDocIds]))
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
      let fullMessageContent = "";
      let lastUpdateTime = performance.now();

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !done });

        if (chunkValue) {
          buffer += chunkValue;

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
            fullMessageContent += appendText;

            // Throttle React state updates to ~30ms to prevent choppiness
            const now = performance.now();
            if (now - lastUpdateTime > 30) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: fullMessageContent }
                    : msg
                )
              );
              lastUpdateTime = now;
            }
            buffer = "";
          }
        }
      }

      // Flush any remaining buffer and ensure the final state is fully updated
      if (buffer) {
        fullMessageContent += buffer;
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: fullMessageContent }
            : msg
        )
      );
    } catch (error) {
      console.error(error);
      setGenerationState("error");
    } finally {
      setGenerationState((prev) => (prev === "streaming" || prev === "requesting" || prev === "searching" ? "complete" : prev));
    }
  };

  const handleFilesSelected = async (files: FileList) => {
    if (status === "unauthenticated") {
      if (input.trim()) {
        sessionStorage.setItem("nexus_draft_prompt", input);
      }
      setAuthModalTitle("Welcome back");
      setAuthModalOpen(true);
      return;
    }
    if (status === "loading") return;

    const newAttachments: AttachedDocument[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Process each file
    for (const attachment of newAttachments) {
      try {
        // Upload simulation for progress (using XMLHttpRequest or fetch)
        // Since fetch doesn't support upload progress out of the box, we'll simulate progress
        // and switch to 'processing' when the fetch fires.
        setAttachments((prev) =>
          prev.map((doc) =>
            doc.id === attachment.id ? { ...doc, status: "processing" } : doc
          )
        );

        const formData = new FormData();
        formData.append("file", attachment.file);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Failed to upload");
        }

        const data = await res.json();
        if (data.success) {
          setAttachments((prev) =>
            prev.map((doc) =>
              doc.id === attachment.id
                ? { ...doc, status: "ready", documentId: data.documentId }
                : doc
            )
          );
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        setAttachments((prev) =>
          prev.map((doc) =>
            doc.id === attachment.id
              ? { ...doc, status: "failed", error: error.message }
              : doc
          )
        );
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((doc) => doc.id !== id));
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
              attachments={attachments}
              onRemoveAttachment={handleRemoveAttachment}
              onFilesSelected={handleFilesSelected}
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
              attachments={attachments}
              onRemoveAttachment={handleRemoveAttachment}
              onFilesSelected={handleFilesSelected}
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authModalTitle}
      />
    </div>
  );
}
