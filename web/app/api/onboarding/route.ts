// /app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import User from "@/models/User";
import {connectDB} from "@/lib/db";
import { SessionUser } from "@/types";

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    // Use the standard, secure way to get the session.
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { completed } = body;

    if (typeof completed !== "boolean") {
        return NextResponse.json({ error: "Invalid 'completed' value in request." }, { status: 400 });
    }

    try {
        await connectDB();

        // Mark the specific user who completed the flow as onboarded.
        // It's safer to update only the current user unless you have a specific
        // reason to update the whole organization at once.
        const result = await User.updateOne(
            { _id: user.id },
            { $set: { "onboarding.completed": completed } }
        );

        if (result.modifiedCount === 0) {
            // This can happen if the value was already `true`, so it's not a hard error.
            return NextResponse.json({ message: "Onboarding status was already set." });
        }
        
        // IMPORTANT: When onboarding is complete, the user's session data is now stale.
        // The next-auth database adapter, when configured correctly, will automatically
        // refresh the session on the next request. This update ensures that happens.

        return NextResponse.json({ message: "Onboarding status updated successfully." });
    } catch (error) {
        console.error("Onboarding PATCH error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}