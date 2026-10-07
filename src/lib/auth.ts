import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }
  return { ...user, id: user.id as string };
}
