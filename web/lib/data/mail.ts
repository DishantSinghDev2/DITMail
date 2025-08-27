// lib/data/mail.ts
import { unstable_cache } from 'next/cache';
import Message from '@/models/Message';
import { connectDB } from '@/lib/db';
import { Types } from 'mongoose';
import Folder from '@/models/Folder';
import Label from '@/models/Label';
import { ObjectId } from 'mongodb';

export interface FolderCounts {
  inbox?: { total: number; unread: number };
  sent?: { total: number; unread: number };
  drafts?: { total: number; unread: number };
  // Add other folders as needed
  [key: string]: { total: number; unread: number } | undefined;
}

/**
 * Fetches and caches total and unread counts for all standard mail folders.
 */
export const getFolderCounts = async (userId: string | Types.ObjectId): Promise<FolderCounts> => {
  await connectDB();
  const counts = await Message.aggregate([
    { $match: { user_id: new ObjectId(userId) } },
    {
      $group: {
        _id: '$folder',
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
      },
    },
  ]);

  // Format the result into a more accessible object
  const folderCounts: FolderCounts = {};
  counts.forEach(count => {
    folderCounts[count._id] = { total: count.total, unread: count.unread };
  });
  return folderCounts;
}


export async function getCustomFolders(userId: string) {
  try {
    await connectDB();
    // Use .lean() to get plain JS objects instead of Mongoose docs
    const folders = await Folder.find({ user_id: new ObjectId(userId) }).lean();

    // Manually serialize the data to ensure it's plain
    return folders.map(folder => ({
      _id: folder._id.toString(), // Convert ObjectId to string
      name: folder.name,
      // Add other folder properties here if they exist
    }));
  } catch (error) {
    console.error("Database Error: Failed to fetch custom folders.", error);
    return [];
  }
}

export async function getLabels(userId: string) {
  try {
    await connectDB();
    const labels = await Label.find({ user_id: new ObjectId(userId) }).lean();

    // Manually serialize the data
    return labels.map(label => ({
      _id: label._id.toString(), // Convert ObjectId to string
      name: label.name,
      color: label.color,
      // Convert any other complex types here (like Dates)
      // created_at: label.created_at.toISOString(),
    }));
  } catch (error) {
    console.error("Database Error: Failed to fetch labels.", error);
    return [];
  }
}
