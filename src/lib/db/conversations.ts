import { db } from "@nexus/database";

export async function createConversation(userId: string, title?: string) {
  const conversation = await db.orm.public.Conversation.create({
    userId,
    title: title || "New Conversation",
  });
  return conversation;
}

export async function listConversations(userId: string) {
  const conversations = await db.orm.public.Conversation
    .where({ userId })
    .orderBy((f) => f.updatedAt.desc())
    .all();
  return conversations;
}

export async function getConversationWithMessages(userId: string, id: string) {
  const conversation = await db.orm.public.Conversation
    // @ts-ignore: contract.d.ts internal resolution issue
    .include('messages')
    .where({ id, userId })
    .first();
  return conversation;
}

export async function updateConversationTitle(userId: string, id: string, title: string) {
  return await db.orm.public.Conversation
    .where({ id, userId })
    .update({ title });
}
