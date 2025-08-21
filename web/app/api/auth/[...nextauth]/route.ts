import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth/next"
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { getMongoClientPromise } from "@/lib/db" // Assuming connectDB is called within this
import { JWT } from "next-auth/jwt"
import User from "@/models/User" // Your User model
import Organization from "@/models/Organization" // Import Organization model
import Plan from "@/models/Plan" // Import Plan model
import { handleNewUserOnboarding } from "@/lib/auth/onboarding"

// STEP 1: Update the type declarations to include all your custom data.
// This provides type safety for your session and token objects.

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            image: string; // Keep this if your profile callback provides it
            org_id: string;
            mailboxAccess: boolean;
            onboarding: {
                completed: boolean;
            };
            plan: string;
            nextDueDate?: string; // Optional, as it's not in the schema yet
        };
    }
}

declare module "next-auth/jwt" {
    // The JWT token now holds all the custom data
    interface JWT {
        id: string;
        name: string;
        email: string;
        picture?: string; // picture is a standard JWT claim
        role: string;
        org_id: string;
        mailboxAccess: boolean;
        onboarding: {
            completed: boolean;
        };
        plan: string;
        nextDueDate?: string;
    }
}


// This function is for REFRESHING the token. Your implementation is correct.
async function refreshAccessToken(token: JWT) {
    try {
        const response = await fetch("https://whatsyour.info/api/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: process.env.WYI_CLIENT_ID,
                client_secret: process.env.WYI_CLIENT_SECRET,
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
    pages: {
        signIn: "/auth/login",
        error: '/auth/login',
    },
    providers: [
        {
            // ... (Your 'wyi' provider configuration remains the same)
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
                    email: profile.email,
                    image: `https://whatsyour.info/api/v1/avatar/${profile.username}`,
                    emailVerified: profile.emailVerified,
                };
            },
        },
    ],

    // --- NEW `events` CALLBACK ---
    events: {
      /**
       * This event is triggered only when a new user is created in the database.
       * It's the perfect place to run first-time setup logic.
       */
      async createUser({ user }) {
        // We call our dedicated helper function to handle the logic.
        // We don't need to `await` it here if we don't want to block the
        // login response, but it's generally safer to do so.
        await handleNewUserOnboarding(user);
      }
    },

    callbacks: {
        // STEP 2: The JWT callback is where the token is created and enriched.
        // This runs on the server ONLY.
        async jwt({ token, user, account }) { // <-- `isNewUser` is available here
            // On initial sign-in, the 'user' object is available.
            if (user && account) {
                // IMPORTANT: The `populate` query might fail on the very first sign-in
                // because the `createUser` event runs concurrently. It's safer to fetch
                // the user again here to ensure the `org_id` has been set.
                const dbUser = await User.findById(user.id).populate({
                    path: 'org_id',
                    populate: { path: 'plan_id' }
                });
                
                if (!dbUser) {
                    return token; // Should not happen
                }
                

                // Now, attach all the required data to the token.
                token.id = dbUser._id.toString();
                token.name = dbUser.name;
                token.email = dbUser.email;
                token.role = dbUser.role; // This will now correctly be "owner" for new users
                token.mailboxAccess = dbUser.mailboxAccess;
                token.org_id = dbUser.org_id?._id.toString(); // Safely access org_id
                token.onboarding = {
                    completed: dbUser.onboarding?.completed || false,
                };

                // Safely access the populated plan name
                if (dbUser.org_id && dbUser.org_id.plan_id) {
                    token.plan = dbUser.org_id.plan_id.name;
                } else {
                    token.plan = 'none';
                }
                return token;
            }
            return token;
        },


        // STEP 3: The session callback makes the token data available to the client.
        // It receives the enriched token from the `jwt` callback.
        async session({ session, token }) {
            // We are mapping the properties from our custom JWT to the session.user object.
            session.user.id = token.id;
            session.user.name = token.name;
            session.user.email = token.email;
            session.user.role = token.role;
            session.user.org_id = token.org_id;
            session.user.mailboxAccess = token.mailboxAccess;
            session.user.onboarding = token.onboarding;
            session.user.plan = token.plan;
            session.user.nextDueDate = token.nextDueDate;
            
            // Note: `session.user.image` is handled by the default session behavior if available
            if(token.picture) {
                session.user.image = token.picture;
            }

            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };