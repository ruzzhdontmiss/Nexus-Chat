import { getDb } from "@/lib/db-client";

export async function createMessage(
  userId: string,
  conversationId: string,
  role: string,
  content: string,
  metadata?: string | null,
) {
  // First ensure the conversation belongs to the user
  const conversation = await (await getDb()).orm.public.Conversation.where({ id: conversationId, userId }).first();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const message = await (await getDb()).orm.public.Message.create({
    conversationId,
    role,
    content,
    ...(metadata ? { metadata } : {}),
  });

  // Update conversation updatedAt
  await (await getDb()).orm.public.Conversation
    .where({ id: conversationId })
    .update({ updatedAt: new Date().toISOString() });

  return message;
}
