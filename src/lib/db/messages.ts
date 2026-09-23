import { db } from "@/prisma/db";

export async function createMessage(userId: string, conversationId: string, role: string, content: string) {
  // First ensure the conversation belongs to the user
  const conversation = await db.orm.public.Conversation.where({ id: conversationId, userId }).first();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const message = await db.orm.public.Message.create({
    conversationId,
    role,
    content,
  });

  // Update conversation updatedAt
  await db.orm.public.Conversation
    .where({ id: conversationId })
    .update({ updatedAt: new Date().toISOString() });

  return message;
}
