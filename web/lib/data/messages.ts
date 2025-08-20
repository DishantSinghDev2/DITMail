// lib/data/messages.ts
import { unstable_cache } from 'next/cache';
import Message from '@/models/Message';
import {connectDB} from '@/lib/db';
import { Message as IMessage, MessageThread } from '@/types';
import { Types } from 'mongoose';

// Cache configuration
const CACHE_REVALIDATION_PERIOD = 300; // 5 minutes

/**
 * Fetches and caches message threads for a specific folder.
 * The cache is tagged by user and folder, allowing for targeted invalidation.
 */
export const getMessagesForFolder = unstable_cache(
  async (userId: string, folder: string, page: number = 1, limit: number = 25): Promise<{ messages: MessageThread[], total: number }> => {
    console.log(`DATABASE QUERY: Fetching messages for user ${userId}, folder ${folder}`);
    await connectDB();
    
    const query: any = { user_id: userId, folder };

    const pipeline = [
      { $match: query },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: "$thread_id",
          latestMessage: { $first: "$$ROOT" },
          messageCount: { $sum: 1 },
          unreadCount: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
        },
      },
      {
        $lookup: { // Populate attachments
          from: "attachments",
          localField: "latestMessage.attachments",
          foreignField: "_id",
          as: "populatedAttachments",
        },
      },
      { $sort: { "latestMessage.created_at": -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const threads = await Message.aggregate(pipeline);
    
    // Map the result to match our MessageThread type
    const messages: MessageThread[] = threads.map(thread => ({
      ...(thread.latestMessage as IMessage),
      attachments: thread.populatedAttachments,
      messageCount: thread.messageCount,
      unreadCount: thread.unreadCount,
    }));

    const total = await Message.distinct('thread_id', query).then(res => res.length);
    
    return { messages: JSON.parse(JSON.stringify(messages)), total };
  },
  ['messages-by-folder'],
  {
    tags: (userId, folder) => [`messages:${userId}:${folder}`],
    revalidate: CACHE_REVALIDATION_PERIOD,
  }
);

/**
 * Fetches and caches all messages within a single thread.
 */
export const getMessageThread = unstable_cache(
  async (userId: string, messageId: string): Promise<IMessage[] | null> => {
    console.log(`DATABASE QUERY: Fetching thread for message ${messageId}`);
    await connectDB();

    const initialMessage = await Message.findOne({ _id: messageId, user_id: userId });
    if (!initialMessage) return null;

    const threadMessages = await Message.find({ thread_id: initialMessage.thread_id, user_id: userId })
      .populate("attachments")
      .sort({ created_at: 1 }); // Sort oldest to newest for conversation flow

    return JSON.parse(JSON.stringify(threadMessages));
  },
  ['message-thread-by-id'],
  {
    tags: (userId, messageId) => [`thread:${messageId}`], // Tag by message ID to find the thread
    revalidate: CACHE_REVALIDATION_PERIOD,
  }
);

// --- NEW FUNCTION TO GET MESSAGE POSITION ---
/**
 * Finds the position of a specific message's thread within a sorted folder list.
 * @returns The total number of threads in the folder and the 1-based index of the current thread.
 */
export const getMessagePositionInFolder = unstable_cache(
  async (userId: string | Types.ObjectId, folder: string, messageId: string): Promise<{ total: number; index: number }> => {
    console.log(`DATABASE QUERY: Finding position for message ${messageId} in folder ${folder}`);
    await connectDB();

    // 1. Find the thread_id of the current message
    const currentMessage = await Message.findOne({ _id: messageId, user_id: userId }, { thread_id: 1 }).lean();
    if (!currentMessage) {
      return { total: 0, index: 0 };
    }
    const currentThreadId = currentMessage.thread_id;

    // 2. Get all unique thread_ids in the folder, sorted by the latest message in each thread
    const threadsInFolder = await Message.aggregate([
      { $match: { user_id: userId, folder: folder } },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: "$thread_id",
          latestMessageDate: { $first: "$created_at" }
        }
      },
      { $sort: { latestMessageDate: -1 } },
      { $project: { _id: 1 } } // We only need the thread_id for indexing
    ]);

    const total = threadsInFolder.length;
    
    // 3. Find the 1-based index of the current thread in the sorted list
    const index = threadsInFolder.findIndex(thread => thread._id === currentThreadId) + 1;

    return { total, index };
  },
  ['message-position-in-folder'],
  {
    tags: (userId, folder) => [`messages-position:${userId}:${folder}`],
    revalidate: CACHE_REVALIDATION_PERIOD,
  }
);
