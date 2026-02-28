import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { BASE_URL } from "@/lib/api"
import axios from "axios"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google" && profile) {
                try {
                    const response = await axios.post(`${BASE_URL}/auth/google`, {
                        googleId: profile.sub,
                        email: user.email,
                        name: user.name,
                        profilePicture: user.image
                    });

                    if (response.data.success) {
                        (user as any).accessToken = response.data.token;
                        (user as any).isOnboarded = response.data.user.isOnboarded;
                        return true;
                    }
                } catch (error) {
                    console.error("Backend Auth Error: ", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = (user as any).accessToken;
                token.isOnboarded = (user as any).isOnboarded;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session as any).accessToken = token.accessToken;
                (session.user as any).isOnboarded = token.isOnboarded;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

