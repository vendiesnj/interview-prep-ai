// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  debug: false,

  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: "select_account", // forces the chooser
    },
  },
}),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
  async jwt({ token, user }) {
    // On first sign-in, `user` is available
    if (user?.id) {
      token.userId = user.id;
    }

    // If we don't have an id, nothing to hydrate
    if (!token.userId) return token;

    // Hydrate subscription fields from DB (kept lightweight)
    const dbUser = await prisma.user.findUnique({
      where: { id: token.userId as string },
      select: {
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripePriceId: true,
        currentPeriodEnd: true,
      },
    });

    token.subscriptionStatus = dbUser?.subscriptionStatus ?? "free";
    token.stripeCustomerId = dbUser?.stripeCustomerId ?? null;
    token.stripePriceId = dbUser?.stripePriceId ?? null;
    token.currentPeriodEnd = dbUser?.currentPeriodEnd ?? null;

    return token;
  },

  async session({ session, token }) {
    // Make userId available if you want it
    (session.user as any).id = token.userId;

    // Expose subscription fields to the client/server components
    (session.user as any).subscriptionStatus = token.subscriptionStatus ?? "free";
    (session.user as any).stripeCustomerId = token.stripeCustomerId ?? null;
    (session.user as any).stripePriceId = token.stripePriceId ?? null;
    (session.user as any).currentPeriodEnd = token.currentPeriodEnd ?? null;

    return session;
  },
},
};

// use the exported authOptions here
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };