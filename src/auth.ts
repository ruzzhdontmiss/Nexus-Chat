import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/db-client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      // Upsert the user into the Prisma database
      const existingUser = await (await getDb()).orm.public.User.where({ email: user.email }).first();
      
      if (!existingUser) {
        const newUser = await (await getDb()).orm.public.User.create({
          email: user.email,
          name: user.name || null,
        });
        user.id = newUser.id;
      } else {
        user.id = existingUser.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    // We can define custom pages if needed, but for now default is fine
    // or we just trigger signIn from the UI directly
  },
});
