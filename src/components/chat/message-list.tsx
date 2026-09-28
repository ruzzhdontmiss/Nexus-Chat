"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageType } from "./message";

import { GenerationState } from "./chat-interface";

interface MessageListProps {
  messages: MessageType[];
  generationState: GenerationState;
}

export function MessageList({ messages, generationState }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 min-h-0 w-full">
      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-32 space-y-8">
        {messages.map((msg, idx) => (
          <Message 
            key={msg.id} 
            message={msg} 
            generationState={idx === messages.length - 1 ? generationState : "idle"} 
          />
        ))}
        <div ref={endOfMessagesRef} className="h-4" />
      </div>
    </ScrollArea>
  );
}
