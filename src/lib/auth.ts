import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: UserRole;
    companyId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      companyId: string | null;
    };
  }
}

// `declare module "next-auth/jwt"` augmentation is unreliable with this next-auth
// beta's subpath exports under bundler resolution, so the JWT shape is cast locally instead.
type AppJwtClaims = { id: string; role: UserRole; companyId: string | null };

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        Object.assign(token, {
          id: user.id!,
          role: user.role,
          companyId: user.companyId,
        } satisfies AppJwtClaims);
      }
      return token;
    },
    session({ session, token }) {
      const claims = token as unknown as AppJwtClaims;
      session.user.id = claims.id;
      session.user.role = claims.role;
      session.user.companyId = claims.companyId;
      return session;
    },
  },
});
