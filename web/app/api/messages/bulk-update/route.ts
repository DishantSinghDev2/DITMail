// app/api/messages/bulk-update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth"; // Assuming you have this helper
import connectDB from "@/lib/db"; // Assuming you have this helper
import Message from "@/models/Message"; // Your Mongoose Message model

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the request body
    const { action, messageIds } = await request.json();

    // 3. Validate the input
    if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'action' and 'messageIds' array are required." },
        { status: 400 }
      );
    }

    await connectDB();

    // 4. Define the update operation based on the action
    let updateOperation: any;

    switch (action) {
      case "delete":
        updateOperation = { $set: { folder: "trash" } };
        break;
      case "archive":
        updateOperation = { $set: { folder: "archive" } };
        break;
      case "spam":
        updateOperation = { $set: { folder: "spam" } };
        break;
      case "unread":
        updateOperation = { $set: { read: false } };
        break;
      case "read":
        updateOperation = { $set: { read: true } };
        break;
      case "star":
        updateOperation = { $set: { starred: true } };
        break;
      case "unstar":
        updateOperation = { $set: { starred: false } };
        break;
      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // 5. Create the query to update only the user's messages
    const filter = {
      user_id: user._id,
      _id: { $in: messageIds },
    };

    // 6. Perform the bulk update
    const result = await Message.updateMany(filter, updateOperation);

    if (result.matchedCount === 0) {
        return NextResponse.json(
            { message: "No matching messages found to update." },
            { status: 200 }
        );
    }

    return NextResponse.json(
      {
        message: "Messages updated successfully.",
        updatedCount: result.modifiedCount,
      },
      { status: 200 }
    );
      
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}