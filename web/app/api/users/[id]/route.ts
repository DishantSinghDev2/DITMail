import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import User from "@/models/User"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { SessionUser } from "@/types"
import { logAuditEvent } from "@/lib/audit"
import jwt from "jsonwebtoken" // <-- Import JWT

// --- Environment variables for the internal sync ---
const WYI_MANAGE_URL = process.env.WHATS_YOUR_INFO_SYNC_URL // e.g., https://whatsyour.info/api/internal/manage-user
const INTERNAL_SECRET = process.env.INTERNAL_JWT_SECRET   // <-- The SAME secret

/**
 * Reusable helper to sync user actions to WhatsYour.Info
 * @param action - The action to perform: "create", "update", or "delete"
 * @param payload - The data required for the action
 */
async function syncUserToWhatsYourInfo(action: 'update' | 'delete', payload: object) {
  if (!WYI_MANAGE_URL || !INTERNAL_SECRET) {
    console.warn("Skipping WhatsYour.Info sync: URL or secret not configured.");
    return;
  }

  try {
    const tokenPayload = { action, payload };
    const token = jwt.sign(tokenPayload, INTERNAL_SECRET, { expiresIn: '60s' });

    const response = await fetch(WYI_MANAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      // Body is now empty as all data is in the JWT
      body: JSON.stringify({}),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to sync user action '${action}'. Status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
    }

    console.log(`Successfully synced action '${action}' for user.`);

  } catch (error) {
    console.error(`Error during WhatsYour.Info user sync (action: ${action}):`, error);
  }
}


// --- UPDATED PATCH FUNCTION ---
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json();
    delete updates.password_hash;

    await connectDB();

    // Find the user *before* the update to get their original email
    const targetUser = await User.findOne({ _id: params.id, org_id: user.org_id });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const originalEmail = targetUser.email; // Capture original email for sync

    // ... (your existing permission checks) ...
    if (targetUser.role === "owner" && user.role !== "owner") {
      return NextResponse.json({ error: "Cannot modify owner account" }, { status: 403 })
    }

    // Perform the update in DITMail's DB
    const updatedUser = await User.findByIdAndUpdate(params.id, updates, { new: true }).select("-password_hash");

    // --- NEW: Sync the update to WhatsYour.Info ---
    const updatesForWyi: { [key: string]: string } = {};
    if (updates.name) {
        const [firstName, ...lastNameParts] = updates.name.split(' ');
        updatesForWyi.firstName = firstName;
        updatesForWyi.lastName = lastNameParts.join(' ');
    }
    if (updates.email) {
        updatesForWyi.email = updates.email;
    }
    
    if (Object.keys(updatesForWyi).length > 0) {
        await syncUserToWhatsYourInfo('update', {
            currentEmail: originalEmail,
            updates: updatesForWyi,
        });
    }
    // --- END NEW SECTION ---

    await logAuditEvent({
      user_id: user.id,
      action: "user_updated",
      details: { updated_user_id: params.id, changes: updates },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --- UPDATED DELETE FUNCTION ---
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete users" }, { status: 403 });
    }

    await connectDB();

    // Find the user to get their email before deletion
    const targetUser = await User.findOne({ _id: params.id, org_id: user.org_id });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ... (your existing permission checks) ...
    if (targetUser._id.toString() === user.id.toString() || targetUser.role === "owner") {
      return NextResponse.json({ error: "Cannot delete your own account or another owner" }, { status: 403 })
    }

    // --- NEW: Sync the deletion to WhatsYour.Info ---
    await syncUserToWhatsYourInfo('delete', { email: targetUser.email });
    // --- END NEW SECTION ---

    // Perform the deletion from DITMail's DB
    await User.findByIdAndDelete(params.id);

    await logAuditEvent({
      user_id: user.id,
      action: "user_deleted",
      details: { deleted_user_id: params.id, email: targetUser.email },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}