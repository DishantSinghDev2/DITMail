import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth/next"
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { getMongoClientPromise } from "@/lib/db" // Assuming connectDB is called within this
import { JWT } from "next-auth/jwt"
import User from "@/models/User" // Your User model
import Organization from "@/models/Organization" // Import Organization model
import Plan from "@/models/Plan" // Import Plan model

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

    callbacks: {
        // STEP 2: The JWT callback is where the token is created and enriched.
        // This runs on the server ONLY.
        async jwt({ token, user, account }) {
            // This block runs only on initial sign-in when the `user` object is available.
            if (user && account) {
                // Fetch the user from YOUR database to get all the custom fields.
                // We use populate to efficiently get related Organization and Plan data in one go.
                const dbUser = await User.findById(user.id).populate({
                    path: 'org_id', // Populate the organization referenced by org_id
                    populate: {
                        path: 'plan_id' // Then, populate the plan referenced in the organization
                    }
                });
                
                if (!dbUser) {
                    // This should not happen if the adapter is working correctly, but it's a safe check.
                    return token;
                }

                // Now, attach all the required data from your models to the token.
                token.id = dbUser._id.toString();
                token.name = dbUser.name;
                token.email = dbUser.email;
                token.role = dbUser.role;
                token.mailboxAccess = dbUser.mailboxAccess;
                token.org_id = dbUser.org_id._id.toString();
                token.onboarding = {
                    completed: dbUser.onboarding.completed
                };

                // Safely access the populated plan name
                if (dbUser.org_id && dbUser.org_id.plan_id) {
                    token.plan = dbUser.org_id.plan_id.name;
                } else {
                    token.plan = 'none'; // Default value if plan is not found
                }

                // Placeholder for 'nextDueDate'. You need to implement logic to get this.
                // For example, it might come from a subscription field on the Organization model.
                // token.nextDueDate = dbUser.org_id.subscriptionEndDate?.toISOString();

                return token;
            }

            // For subsequent requests, the data is already in the token, so we just return it.
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