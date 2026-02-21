import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWallet } from "@/lib/wallet";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      // OAuth 1.0a — uses consumer key/secret
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) return null;

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || "",
          image: data.user.user_metadata?.avatar_url || "",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "twitter") {
        // Upsert user in Supabase
        const { error } = await supabaseAdmin.from("users").upsert(
          {
            id: user.id,
            email: user.email || "",
            name: user.name || "",
            avatar_url: user.image || "",
          },
          { onConflict: "email" }
        );
        if (error) console.error("User upsert error:", error);

        // Auto-generate Base wallet if user doesn't have one yet
        try {
          const { data: existing } = await supabaseAdmin
            .from("users").select("wallet_address").eq("email", user.email).single();
          if (!existing?.wallet_address) {
            const { address, encryptedKey } = generateWallet();
            await supabaseAdmin.from("users").update({
              wallet_address: address,
              wallet_encrypted_key: encryptedKey,
            }).eq("email", user.email);
            console.log(`Wallet generated for ${user.email}: ${address}`);
          }
        } catch (e) { console.error("Wallet generation error:", e); }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
