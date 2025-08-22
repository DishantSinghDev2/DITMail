import { NextResponse } from 'next/server';
import Message from '@/models/Message';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    await connectDB();

    // Find the user
    const user = await User.findOne({ email }) || await User.findOne({ name }); // fallback: maybe search by name

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is ditmail.online
    if (email.endsWith('@ditmail.online')) {
      if (user.email !== email) {
        const oldEmail = user.email;

        // Update the user's email in DB
        await User.updateOne({_id: user._id}, {
          $set: {
            email,
            mailboxAccess: true
          }
        })

        // If old email existed and was different, notify external API
        // if (oldEmail && oldEmail !== email) {
        //   try {
        //     await fetch('https://external.api/notify-email-change', {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         oldEmail,
        //         newEmail: email,
        //         userId: user._id.toString(),
        //       }),
        //     });
        //   } catch (apiErr) {
        //     console.error('External API call failed:', apiErr);
        //   }
        // }
      }
    }

    // Create welcome email message
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

    return NextResponse.json({ success: true, message: 'Welcome email created.' });
  } catch (error) {
    console.error("Failed to create welcome email:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
