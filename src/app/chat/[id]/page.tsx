import { ChatInterface } from "@/components/chat/chat-interface";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { notFound } from "next/navigation";
import { MessageType } from "@/components/chat/message";
import { requireUser } from "@/lib/auth";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const conversation = await getConversationWithMessages(user.id, id);
  
  if (!conversation) {
    notFound();
  }

  const initialMessages: MessageType[] = conversation.messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content
  }));

  return <ChatInterface initialConversationId={id} initialMessages={initialMessages} />;
}
