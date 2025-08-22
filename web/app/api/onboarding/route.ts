
// /app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function PATCH(request: NextRequest) {
    // 1. Authenticate the request and ensure we have a user ID.
    const session: Session | null = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate the request body.
    const body = await request.json();
    const { completed } = body;
    if (typeof completed !== "boolean") {
        return NextResponse.json({ error: "Invalid 'completed' value. It must be a boolean." }, { status: 400 });
    }

    try {
        await connectDB();

        // 3. Atomically find and update the user's onboarding status in the database.
        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            { $set: { "onboarding.completed": completed } },
            { new: true } // This option returns the updated document.
        );

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // 4. Return a success response.
        return NextResponse.json({
            message: "Onboarding status updated successfully in the database.",
            onboarding: updatedUser.onboarding,
        });

    } catch (error) {
        console.error("Onboarding PATCH error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}