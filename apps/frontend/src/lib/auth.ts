import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "super-secret-auth-key-change-in-production-12345678",
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "USER";
        token.accessToken = user.accessToken;
      }

      // OAuth sign-ins have no backend token yet. Exchange the verified provider
      // profile for one so the REST API can authorize subsequent requests.
      if (user && account && !token.accessToken) {
        try {
          const res = await fetch(`${API_URL}/auth/oauth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
            }),
            cache: "no-store",
          });

          if (!res.ok) throw new Error(await res.text());

          const data = (await res.json()) as {
            token: string;
            user: { id: string; role: "ADMIN" | "USER" };
          };
          token.id = data.user.id;
          token.role = data.user.role;
          token.accessToken = data.token;
        } catch (error) {
          console.error("OAuth backend sync failed:", error);
          throw new Error("Gagal menyinkronkan akun OAuth dengan server. Coba lagi.");
        }
      }

      // Roles can be changed by an admin after this session was issued; refresh
      // the claim from the backend so promotions/demotions apply immediately.
      if (!user && token.accessToken) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token.accessToken}` },
            cache: "no-store",
          });
          if (res.ok) {
            const data = (await res.json()) as { user?: { role?: "ADMIN" | "USER" } };
            if (data.user?.role) {
              token.role = data.user.role;
            }
          }
        } catch {
          // Backend unreachable: keep the last known role.
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.role = (token.role as "ADMIN" | "USER") || "USER";
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
