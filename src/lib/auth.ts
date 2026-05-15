import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
    impersonating?: boolean;
    impersonatedName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    emailVerified?: Date | null;
    impersonatorId?: string;
    impersonatedName?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = req?.headers?.["x-forwarded-for"] ?? "unknown";
        const { success } = rateLimit(`login:${ip}`, 5, 60000);
        if (!success) return null;

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.emailVerified =
          (user as { emailVerified?: Date | null }).emailVerified ?? null;
      }

      if (trigger === "update") {
        const update = session as
          | { impersonate?: string; stopImpersonating?: boolean }
          | undefined;

        // Already impersonating — block nested impersonation entirely.
        if (update?.impersonate && token.impersonatorId) {
          return token;
        }

        // Start impersonation: admin (current token) -> target customer.
        if (update?.impersonate && !token.impersonatorId) {
          const admin = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isAdmin: true },
          });
          const target = admin?.isAdmin
            ? await prisma.user.findUnique({
                where: { id: update.impersonate },
                select: { id: true, name: true, email: true, emailVerified: true },
              })
            : null;
          if (admin?.isAdmin && target) {
            token.impersonatorId = token.id as string;
            token.id = target.id;
            token.email = target.email;
            token.name = target.name;
            token.emailVerified = target.emailVerified;
            token.impersonatedName = target.name ?? undefined;
          }
          return token;
        }

        // Stop impersonation: restore the original admin identity.
        if (update?.stopImpersonating && token.impersonatorId) {
          const adminId = token.impersonatorId;
          const admin = await prisma.user.findUnique({
            where: { id: adminId },
            select: { name: true, email: true, emailVerified: true },
          });
          token.id = adminId;
          token.email = admin?.email ?? null;
          token.name = admin?.name ?? null;
          token.emailVerified = admin?.emailVerified ?? null;
          delete token.impersonatorId;
          delete token.impersonatedName;
          return token;
        }

        // Normal update (e.g. email verification): refresh emailVerified.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true },
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      session.user.emailVerified = token.emailVerified as Date | null;
      if (token.impersonatorId) {
        session.impersonating = true;
        session.impersonatedName =
          (token.impersonatedName as string | undefined) ?? null;
      }
      return session;
    },
  },
};
