// lib/data/mail.ts
import { unstable_cache } from 'next/cache';
import Message from '@/models/Message';
import {connectDB} from '@/lib/db';
import { Types } from 'mongoose';

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
export const getFolderCounts = unstable_cache(
  async (userId: string | Types.ObjectId): Promise<FolderCounts> => {
    await connectDB();
    const counts = await Message.aggregate([
      { $match: { user_id: userId } },
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
  },
  ['folder-counts'],
  { tags: (userId) => [`counts:${userId}`], revalidate: 300 } // Revalidate every 5 mins
);