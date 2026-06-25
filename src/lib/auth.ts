import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { sql } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      try {
        await sql`
          INSERT INTO users (id, email, name, image)
          VALUES (${user.id!}, ${user.email}, ${user.name ?? null}, ${user.image ?? null})
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            image = EXCLUDED.image
        `
        if (account) {
          const existingUser = await sql`SELECT id FROM users WHERE email = ${user.email}`
          const userId = existingUser[0]?.id as string
          await sql`
            INSERT INTO accounts (id, user_id, provider, provider_account_id, access_token, refresh_token)
            VALUES (
              gen_random_uuid()::text,
              ${userId},
              ${account.provider},
              ${account.providerAccountId},
              ${account.access_token ?? null},
              ${account.refresh_token ?? null}
            )
            ON CONFLICT (provider, provider_account_id) DO UPDATE SET
              access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token
          `
          user.id = userId
        }
      } catch (e) {
        console.error("signIn error", e)
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const rows = await sql`SELECT id FROM users WHERE email = ${user.email}`
        token.userId = rows[0]?.id as string
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
