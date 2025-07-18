import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import User from "@/models/User";
import connectDB from "@/lib/db";


export async function GET(request: NextRequest) {
    const user = await getAuthUser(request);
    if (!user || !["owner", "admin"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
        await connectDB();
        const onboardingStatus = await User.findOne(
            { _id: user._id }
        );

        if (!onboardingStatus) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({
            completed: onboardingStatus.onboarding?.completed || false,
        });
    } catch (error) {
        console.error("Onboarding status fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const user = await getAuthUser(request);

    if (!user || !["owner", "admin"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (typeof action !== "boolean") {
        return NextResponse.json({ error: "Invalid action value" }, { status: 400 });
    }

    try {
        await connectDB();

        const result = await User.updateMany(
            { org_id: user.org_id },
            { $set: { "onboarding.completed": action } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        return NextResponse.json({ message: "Onboarding status updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}