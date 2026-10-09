import { getDb } from "@/lib/db-client";

export async function createConversation(userId: string, title?: string) {
  const conversation = await (await getDb()).orm.public.Conversation.create({
    userId,
    title: title || "New Conversation",
  });
  return conversation;
}

export async function listConversations(userId: string) {
  const conversations = await (await getDb()).orm.public.Conversation
    .where({ userId })
    .orderBy((f) => f.updatedAt.desc())
    .all();
  return conversations;
}

export async function getConversationWithMessages(userId: string, id: string) {
  const conversation = await (await getDb()).orm.public.Conversation
    // @ts-ignore: contract.d.ts internal resolution issue
    .include('messages')
    .where({ id, userId })
    .first();
  return conversation;
}

export async function updateConversationTitle(userId: string, id: string, title: string) {
  return await (await getDb()).orm.public.Conversation
    .where({ id, userId })
    .update({ title });
}
