import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import AppPassword from '@/models/AppPassword';
import { SessionUser } from '@/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

// Zod schema for creating a new app password
const createSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long.").max(50),
  currentPassword: z.string().min(1, "Your current password is required."),
});

/**
 * GET: Fetches all App Passwords for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const appPasswords = await AppPassword.find({ user_id: user.id })
      .select('name created_at last_used') // Never send the encrypted password to the client
      .sort({ created_at: -1 });

    return NextResponse.json({ appPasswords });

  } catch (error) {
    console.error("Failed to fetch app passwords:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Creates a new App Password for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    await connectDB();

    // Security Check: Verify the user's main password before proceeding
    const userDoc = await User.findById(user.id).select('+password_hash');
    if (!userDoc || !userDoc.password_hash) {
      return NextResponse.json({ error: 'User account is not configured correctly.' }, { status: 404 });
    }

    const isPasswordCorrect = await bcrypt.compare(validation.data.currentPassword, userDoc.password_hash);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'The password you entered is incorrect.' }, { status: 403 });
    }

    // Generate a secure, random password
    const plainTextPassword = `ap-${crypto.randomBytes(16).toString('hex')}`;

    // Create a new AppPassword instance.
    // **IMPORTANT**: We save the PLAIN TEXT password here.
    // The pre('save') hook on your model will encrypt it automatically.
    const newAppPassword = new AppPassword({
      user_id: user.id,
      name: validation.data.name,
      encrypted_password: plainTextPassword, // Mongoose hook will encrypt this
    });

    await newAppPassword.save();

    // Return the plain text password to the user ONCE.
    return NextResponse.json({
      name: newAppPassword.name,
      password: plainTextPassword, // This is the only time the user will see it.
    }, { status: 201 });

  } catch (error) {
    console.error("Failed to create app password:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a specific App Password for the authenticated user.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Password ID is required.' }, { status: 400 });
    }

    await connectDB();

    // The { user_id: user.id } check is CRITICAL.
    // It ensures a user can only delete their own passwords.
    const result = await AppPassword.findOneAndDelete({ _id: id, user_id: user.id });

    if (!result) {
        // This means the password either didn't exist or didn't belong to the user.
        return NextResponse.json({ error: 'App password not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'App password deleted successfully.' });

  } catch (error) {
    console.error("Failed to delete app password:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}