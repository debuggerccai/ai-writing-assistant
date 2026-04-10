import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

import { generateVisitorDisplayName } from "@/lib/auth/generateDisplayName";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const githubConfigured =
  Boolean(process.env.AUTH_GITHUB_ID) && Boolean(process.env.AUTH_GITHUB_SECRET);

function isPrismaUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/** Auth.js 会把 OAuth 用户邮箱写入 user.email；signIn 回调里应优先用它，并与 DB 一样做小写归一化，避免唯一键冲突被当成 AccessDenied。 */
function normalizeGithubEmail(
  user: { email?: string | null } | undefined,
  profile: unknown
): string | null {
  const fromUser = user?.email?.trim();
  if (fromUser) return fromUser.toLowerCase();

  if (
    profile &&
    typeof profile === "object" &&
    "email" in profile &&
    typeof profile.email === "string" &&
    profile.email.trim()
  ) {
    return profile.email.trim().toLowerCase();
  }

  if (profile && typeof profile === "object" && "id" in profile) {
    const rawId = (profile as { id: unknown }).id;
    const login =
      "login" in profile && typeof profile.login === "string" ? profile.login : "user";
    if (typeof rawId === "number" || typeof rawId === "string") {
      return `${String(rawId)}+${login}@users.noreply.github.com`.toLowerCase();
    }
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me",
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const { prisma } = await import("@/lib/db/prisma");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        };
      },
    }),
    ...(githubConfigured
      ? [
        GitHub({
          clientId: process.env.AUTH_GITHUB_ID!,
          clientSecret: process.env.AUTH_GITHUB_SECRET!,
        }),
      ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github") return true;

      const email = normalizeGithubEmail(user, profile);
      if (!email) return false;

      const { prisma } = await import("@/lib/db/prisma");
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true;

      const login =
        profile &&
          typeof profile === "object" &&
          "login" in profile &&
          typeof profile.login === "string"
          ? profile.login
          : null;

      try {
        await prisma.user.create({
          data: {
            email,
            passwordHash: null,
            displayName: login ?? generateVisitorDisplayName(),
          },
        });
      } catch (e) {
        if (isPrismaUniqueConstraintViolation(e)) return true;
        throw e;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider) {
        token.provider = account.provider;
      }

      if (user && account?.provider === "credentials") {
        token.userId = user.id;
        token.displayName = (user as { displayName: string }).displayName;
        return token;
      }

      if (user && account?.provider === "github") {
        const email = normalizeGithubEmail(user, profile);
        if (email) {
          const { prisma } = await import("@/lib/db/prisma");
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            token.userId = dbUser.id;
            token.displayName = dbUser.displayName;
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & {
          id?: string;
          displayName?: string;
          provider?: string;
        };
        u.id = token.userId as string;
        u.displayName = token.displayName as string;
        if (token.provider) {
          u.provider = token.provider as string;
        }
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isPublic =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/register" ||
        nextUrl.pathname.startsWith("/api/auth");

      if (isPublic) return true;

      return !!auth?.user;
    },
  },
});
