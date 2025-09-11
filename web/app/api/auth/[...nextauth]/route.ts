import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth/next"
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { connectDB, getMongoClientPromise } from "@/lib/db"
import { JWT } from "next-auth/jwt"
import User from "@/models/User"
import "@/models/Organization"
import "@/models/Plan"
import { handleNewUserOnboarding } from "@/lib/auth/onboarding"
import Account from "@/models/Account"
import { encode } from "next-auth/jwt"


declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            username: string;
            email: string;
            role: string;
            image: string;
            org_id: string;
            mailboxAccess: boolean;
            onboarding: {
                completed: boolean;
            };
            plan: string;
            nextDueDate?: string;
            accessToken?: string;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        name: string;
        username: string;
        email: string;
        picture?: string;
        role: string;
        org_id: string;
        mailboxAccess: boolean;
        onboarding: {
            completed: boolean;
        };
        plan: string;
        nextDueDate?: string;
        accessToken?: string;
    }
}


// This function is for REFRESHING the token, duh
async function refreshAccessToken(token: JWT) {
    try {
        const response = await fetch("https://whatsyour.info/api/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: process.env.WYI_CLIENT_ID,
                client_secret: process.env.WYI_CLIENT_SECRET, // keep it a secret
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Keep old RT if new one isn't sent
        };
    } catch (error) {
        console.error("Error refreshing access token", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(getMongoClientPromise()),
    session: {
        strategy: "jwt",
    },
    providers: [
        {
            id: "wyi",
            name: "WhatsYourInfo",
            type: "oauth",
            authorization: {
                url: "https://whatsyour.info/oauth/authorize",
                params: { scope: "profile:read email:read" },
            },
            userinfo: "https://whatsyour.info/api/v1/me",
            token: {
                url: "https://whatsyour.info/api/v1/oauth/token",
                async request(context) {
                    const response = await fetch("https://whatsyour.info/api/v1/oauth/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            grant_type: "authorization_code",
                            code: context.params.code,
                            redirect_uri: context.provider.callbackUrl,
                            client_id: context.provider.clientId,
                            client_secret: context.provider.clientSecret,
                        }),
                    });

                    const tokens = await response.json();
                    if (!response.ok) {
                        throw new Error(tokens.error_description || "Token request failed");
                    }
                    return { tokens };
                },
            },
            clientId: process.env.WYI_CLIENT_ID,
            clientSecret: process.env.WYI_CLIENT_SECRET,
            async profile(profile, tokens) {
                return {
                    id: profile._id,
                    name: `${profile.firstName} ${profile.lastName}`,
                    username: profile.username,
                    email: profile.email,
                    image: `https://whatsyour.info/api/v1/avatar/${profile.username}`,
                    emailVerified: profile.emailVerified,
                };
            },
        },
    ],

    // Events callbacks
    events: {
        async createUser({ user }) {
            await connectDB();
            await handleNewUserOnboarding(user);
        }
    },


    callbacks: {
        async signIn({ user, account, profile }) {
            // This callback is triggered on a successful sign-in.
            await connectDB();

            const existingUser = await User.findOne({ email: user.email });

            if (existingUser) {
                // If a user with this email already exists, check if the account is linked.
                const isAccountLinked = await Account.findOne({
                    provider: account?.provider,
                    providerAccountId: account?.providerAccountId,
                });

                if (!isAccountLinked) {
                    await Account.insertOne({
                        userId: existingUser._id,
                        type: account?.type,
                        provider: account?.provider,
                        providerAccountId: account?.providerAccountId,
                        access_token: account?.access_token,
                        refresh_token: account?.refresh_token,
                        expires_at: account?.expires_at,
                        token_type: account?.token_type,
                        scope: account?.scope,
                        id_token: account?.id_token,
                        session_state: account?.session_state,
                    });
                    console.log("Successfully linked new provider to existing user.");
                }
            }
            return true; // Continue with the sign-in
        },

        async jwt({ token, user, profile, account, trigger, session }) {
            await connectDB();

            // 1. Initial sign-in: Populate token with all data.
            if (user && account && profile) {
                const dbUser = await User.findById(user.id).populate({
                    path: 'org_id',
                    populate: { path: 'plan_id' }
                });

                if (!dbUser) return token;

                token.username = (profile as any).username;
                token.id = dbUser._id.toString();
                token.name = dbUser.name;
                token.email = dbUser.email;
                token.role = dbUser.role;
                token.mailboxAccess = dbUser.mailboxAccess;
                token.org_id = dbUser.org_id?._id.toString();
                token.onboarding = { completed: dbUser.onboarding?.completed || false };
                token.plan = dbUser.org_id?.plan_id?.name || 'none';


                return token;
            }

            // 2. Session update: React to client side `update()` calls.
            if (trigger === "update" && session) {
                // If the client is updating the onboarding status
                if (typeof session.onboarding?.completed === 'boolean') {
                    token.onboarding = { completed: session.onboarding.completed };
                }

                // If the client is updating the email
                if (session.email) {
                    token.email = session.email;
                }
            }

            return token;
        },

        async session({ session, token }) {
            // Map all properties from the enriched token to the session.
            session.user.id = token.id;
            session.user.name = token.name;
            session.user.username = token.username;
            session.user.email = token.email;
            session.user.role = token.role;
            session.user.org_id = token.org_id;
            session.user.mailboxAccess = token.mailboxAccess;
            session.user.onboarding = token.onboarding;
            session.user.plan = token.plan;
            session.user.nextDueDate = token.nextDueDate;
            // Encode the entire token object into a secure, verifiable JWT string.
            session.user.accessToken = await encode({
                secret: process.env.NEXTAUTH_SECRET!,
                token: token,
            });


            if (token.picture) {
                session.user.image = token.picture;
            }

            return session;
        },
    },
    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === "production",
                domain: ".dishis.tech", // Set the root domain here
            },
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };