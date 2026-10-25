import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account, profile }) {
      if (account?.provider !== "github") {
        return false;
      }

      const allowedLogin = process.env.GITHUB_ALLOWED_LOGIN?.trim().toLowerCase();
      const githubLogin =
        profile && "login" in profile && typeof profile.login === "string"
          ? profile.login.trim().toLowerCase()
          : undefined;

      return Boolean(allowedLogin && githubLogin === allowedLogin);
    },
  },
});
