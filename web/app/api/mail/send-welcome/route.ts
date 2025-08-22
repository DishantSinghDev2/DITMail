import { NextResponse } from 'next/server';
import Message from '@/models/Message';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route"; // Ensure this path is correct
import { SessionUser } from "@/types";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as SessionUser | undefined;
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ _id: userSession.id })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is ditmail.online
    if (email.endsWith('@ditmail.online')) {
      // Prepare the update object. Always grant mailbox access.
      const updatePayload: { mailboxAccess: boolean; email?: string } = {
        mailboxAccess: true,
      };

      // Conditionally add the email to the payload ONLY if it has changed.
      if (user.email !== email) {
        updatePayload.email = email;
      }

      // Perform the update. This will now run even if the emails are the same.
      await User.updateOne({ _id: user._id }, { $set: updatePayload });
    }

    // Create welcome email message (no changes needed here)
    const welcomeEmail = new Message({
      message_id: new ObjectId(),
      user_id: user._id,
      org_id: user.org_id,
      thread_id: `welcome_${user._id}`,
      from: 'DITMail Team <no-reply@mail.dishis.tech>',
      to: [email],
      subject: `Welcome to DITMail, ${name}!`,
      text: `Hi ${name},\n\nWelcome to DITMail! We're thrilled to have you on board. Your new, secure email inbox is ready.\n\nHappy mailing!\n\nThe DITMail Team`,
      html: `<p>Hi ${name},</p><p>Welcome to <strong>DITMail</strong>! We're thrilled to have you on board. Your new, secure email inbox is ready.</p><p>Happy mailing!<br>The DITMail Team</p>`,
      folder: 'inbox',
      read: false,
      created_at: new Date(),
    });

    await welcomeEmail.save();

    return NextResponse.json({ success: true, message: 'Welcome email created and access granted.' });
  } catch (error) {
    console.error("Failed to create welcome email:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}