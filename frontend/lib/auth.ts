/**
 * School of Chat — Auth.js v5 Configuration
 * frontend/lib/auth.ts
 *
 * Google SSO. JWT sessions. Piggybacking on Arc's Google OAuth app —
 * add https://soc.arc-codex.com/api/auth/callback/google to the
 * Authorised Redirect URIs in Google Cloud Console.
 *
 * Exports: { handlers, auth, signIn, signOut }
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,

    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: { scope: "openid email profile" },
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },

    callbacks: {
        async jwt({ token, account }) {
            if (account?.providerAccountId) {
                token.sub = account.providerAccountId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
});

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
