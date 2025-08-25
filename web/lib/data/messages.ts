import { unstable_cache } from 'next/cache';
import Message from '@/models/Message';
import { connectDB } from '@/lib/db';
import { Message as IMessage, MessageThread } from '@/types';
import { Types } from 'mongoose';
import Draft from '@/models/Draft';
import '@/models/Attachment';

const CACHE_REVALIDATION_PERIOD = 300; // 5 minutes

/**
 * Fetches and caches message threads for a specific folder.
 */
export const getMessagesForFolder = unstable_cache(
  // The userId is always a string from the session.
  async (userId: string, folder: string, page: number = 1, limit: number = 25): Promise<{ messages: MessageThread[], total: number }> => {
    console.log(`DATABASE QUERY: Fetching messages for user ${userId}, folder ${folder}`);
    await connectDB();
    
    // Mongoose will correctly cast the userId string to an ObjectId for the query.
    const query = { user_id: userId, folder };

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
        $lookup: {
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
    console.log('new')

    const threads = await Message.aggregate(pipeline);
    
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
  // Standardize to userId: string
  async (userId: string, messageId: string): Promise<IMessage[] | null> => {
    console.log(`DATABASE QUERY: Fetching thread for message ${messageId}`);
    await connectDB();

    const initialMessage = await Message.findOne({ _id: messageId, user_id: userId });
    if (!initialMessage) return null;

    const threadMessages = await Message.find({ thread_id: initialMessage.thread_id, user_id: userId })
      .populate("attachments")
      .sort({ created_at: 1 });

    return JSON.parse(JSON.stringify(threadMessages));
  },
  ['message-thread-by-id'],
  {
    tags: (userId, messageId) => [`thread:${messageId}`],
    revalidate: CACHE_REVALIDATION_PERIOD,
  }
);

/**
 * Finds the position of a specific message's thread within a sorted folder list.
 */
export const getMessagePositionInFolder = unstable_cache(
  // Standardize to userId: string
  async (userId: string, folder: string, messageId: string): Promise<{ total: number; index: number }> => {
    console.log(`DATABASE QUERY: Finding position for message ${messageId} in folder ${folder}`);
    await connectDB();

    const currentMessage = await Message.findOne({ _id: messageId, user_id: userId }, { thread_id: 1 }).lean();
    if (!currentMessage) {
      return { total: 0, index: 0 };
    }
    const currentThreadId = currentMessage.thread_id;

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
      { $project: { _id: 1 } }
    ]);

    const total = threadsInFolder.length;
    
    // Find the 1-based index of the current thread in the sorted list.
    // Ensure both are strings for a reliable comparison.
    const index = threadsInFolder.findIndex(thread => String(thread._id) === String(currentThreadId)) + 1;

    return { total, index };
  },
  ['message-position-in-folder'],
  {
    // --- THE FIX ---
    // The tags function now correctly accepts all three arguments (userId, folder, messageId),
    // even though it only uses the first two to create the tag. This resolves the signature mismatch.
    tags: (userId, folder, messageId) => [`messages-position:${userId}:${folder}`],
    revalidate: CACHE_REVALIDATION_PERIOD,
  }
);

// --- NEW FUNCTION TO FETCH DRAFTS ---
/**
 * Fetches and caches drafts for a specific user.
 * It transforms the draft data to match the MessageThread shape so the UI can render it.
 */
export const getDraftsForUser = unstable_cache(
  async (userId: string, page: number = 1, limit: number = 25): Promise<{ messages: MessageThread[], total: number }> => {
    console.log(`DATABASE QUERY: Fetching drafts for user ${userId}`);
    await connectDB();

    const query = { user_id: userId };
    
    const [drafts, total] = await Promise.all([
      Draft.find(query)
        .populate('attachments')
        .sort({ updated_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(), // Use .lean() for faster, plain JS objects
      Draft.countDocuments(query)
    ]);
    
    // Transform Draft documents into the MessageThread shape the client expects
    const transformedDrafts: MessageThread[] = drafts.map(draft => ({
      // --- Core Message properties ---
      _id: draft._id.toString(),
      user_id: draft.user_id,
      thread_id: draft._id.toString(), // A draft is its own thread
      subject: draft.subject || '(no subject)',
      from: 'Draft', // Drafts are from the user
      to: draft.to || [],
      text: draft.html?.replace(/<[^>]*>?/gm, '') || '', // Simple plain text preview
      html: draft.html || '',
      read: true, // Drafts are always "read"
      starred: false,
      folder: 'drafts',
      created_at: draft.updated_at.toISOString(), // Use updated_at for sorting
      attachments: draft.attachments || [],
      
      // --- MessageThread-specific properties ---
      messageCount: 1,
      unreadCount: 0,
      
      // --- Custom flag to identify this as a draft on the client ---
      isDraft: true, 
      // Pass the full draft data for the composer
      draftData: {
          to: draft.to?.join(', ') || '',
          cc: draft.cc?.join(', ') || '',
          bcc: draft.bcc?.join(', ') || '',
          subject: draft.subject || '',
          content: draft.html || '',
          attachments: draft.attachments?.map(a => a._id) || [],
      }
    }));
    
    return { messages: transformedDrafts, total };
  },
  ['drafts-by-user'],
  {
    tags: (userId) => [`drafts:${userId}`],
    revalidate: 60, // Drafts can change often, revalidate more frequently
  }
);

// --- NEW FUNCTION TO GET A SINGLE DRAFT'S DATA ---
/**
 * Fetches a single draft by its ID for a specific user.
 * This is used to check if a messageId from a URL corresponds to a draft.
 * @returns The draft object if found, otherwise null.
 */
export const getDraftById = async (userId: string, draftId: string): Promise<any | null> => {
  // This function is simple and fast, so caching is optional but can be added.
  console.log(`DATABASE QUERY: Checking for draft with ID ${draftId}`);
  await connectDB();

  const draft = await Draft.findOne({ _id: draftId, user_id: userId })
    .populate('attachments')
    .lean();

  if (!draft) {
    return null;
  }

  // Transform the data into the shape our composer expects
  return {
    draftId: draft._id.toString(),
    initialData: {
      to: draft.to?.join(', ') || '',
      cc: draft.cc?.join(', ') || '',
      bcc: draft.bcc?.join(', ') || '',
      subject: draft.subject || '',
      content: draft.html || '',
    },
    initialAttachments: draft.attachments || [],
  };
};
