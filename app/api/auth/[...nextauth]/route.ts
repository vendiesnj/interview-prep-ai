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
      if (user?.id) {
        token.userId = user.id;
      }

      const effectiveUserId =
        (token.userId as string | undefined) ?? token.sub ?? null;
      if (!effectiveUserId) return token;

      token.userId = effectiveUserId;

      let dbUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: {
          tenantId: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          stripePriceId: true,
          currentPeriodEnd: true,
          demoPersona: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              themeKey: true,
              logoUrl: true,

              pageBg: true,
              pageBgAccentA: true,
              pageBgAccentB: true,

              textPrimary: true,
              textMuted: true,
              textSoft: true,

              cardBg: true,
              cardBgStrong: true,
              cardBorder: true,
              cardBorderSoft: true,

              inputBg: true,
              inputBorder: true,

              accent: true,
              accentSoft: true,
              accentStrong: true,

              accent2: true,
              accent2Soft: true,

              danger: true,
              dangerSoft: true,

              success: true,
              successSoft: true,
            },
          },
        },
      });

      if (dbUser && !dbUser.tenantId) {
        const userEmail =
          typeof token.email === "string" && token.email.includes("@")
            ? token.email.toLowerCase()
            : null;

        const emailDomain = userEmail ? userEmail.split("@")[1] : null;

        let matchedTenant = emailDomain
          ? await prisma.tenant.findFirst({
              where: {
                emailDomains: {
                  has: emailDomain,
                },
              },
              select: {
                id: true,
                name: true,
                slug: true,
                themeKey: true,
                logoUrl: true,

                pageBg: true,
                pageBgAccentA: true,
                pageBgAccentB: true,

                textPrimary: true,
                textMuted: true,
                textSoft: true,

                cardBg: true,
                cardBgStrong: true,
                cardBorder: true,
                cardBorderSoft: true,

                inputBg: true,
                inputBorder: true,

                accent: true,
                accentSoft: true,
                accentStrong: true,

                accent2: true,
                accent2Soft: true,

                danger: true,
                dangerSoft: true,

                success: true,
                successSoft: true,
              },
            })
          : null;

        // Only assign tenant if matched by email domain — standalone users stay tenant-free
        if (matchedTenant) {
          await prisma.user.update({
            where: { id: effectiveUserId },
            data: { tenantId: matchedTenant.id },
          });

          dbUser = {
            ...dbUser,
            tenantId: matchedTenant.id,
            tenant: matchedTenant,
          };
        }
      }

      // Look up tenant role for redirect logic
      const membership = effectiveUserId && dbUser?.tenantId
        ? await prisma.tenantMembership.findFirst({
            where: { userId: effectiveUserId, tenantId: dbUser.tenantId },
            select: { role: true },
          })
        : null;

      token.tenantId = dbUser?.tenantId ?? null;
      token.tenant = dbUser?.tenant ?? null;
      token.tenantRole = membership?.role ?? null;
      token.subscriptionStatus = dbUser?.subscriptionStatus ?? "free";
      token.stripeCustomerId = dbUser?.stripeCustomerId ?? null;
      token.stripePriceId = dbUser?.stripePriceId ?? null;
      token.currentPeriodEnd = dbUser?.currentPeriodEnd ?? null;
      token.demoPersona = dbUser?.demoPersona ?? null;

      return token;
    },

    async session({ session, token }) {
      (session.user as any).id = token.userId;
      (session.user as any).tenantId = token.tenantId ?? null;
      (session.user as any).tenantRole = token.tenantRole ?? null;

      (session as any).tenant = token.tenant ?? null;

      (session.user as any).subscriptionStatus =
        token.subscriptionStatus ?? "free";
      (session.user as any).stripeCustomerId =
        token.stripeCustomerId ?? null;
      (session.user as any).stripePriceId = token.stripePriceId ?? null;
      (session.user as any).currentPeriodEnd =
        token.currentPeriodEnd ?? null;
      (session.user as any).demoPersona = token.demoPersona ?? null;

      return session;
    },
  }, 


};

// use the exported authOptions here
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };