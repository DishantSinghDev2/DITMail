import { unstable_cache } from 'next/cache';
import Message from '@/models/Message';
import { connectDB } from '@/lib/db';
import { Message as IMessage, MessageThread } from '@/types';
import { ObjectId } from 'mongodb';
import Draft from '@/models/Draft';
import '@/models/Attachment';
import User from '@/models/User';
import { PipelineStage } from "mongoose"; // <--- IMPORT THE TYPE
import { redis } from '../redis';

// Define a type for all the possible filter options to make the function signature cleaner.
type GetMessagesOptions = {
  folder?: string;
  page?: number;
  limit?: number;
  search?: string;
  threadId?: string;
  starred?: boolean;
  unread?: boolean;
  hasAttachments?: boolean;
  priority?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  sender?: string;
  recipient?: string;
  size?: string;
  label?: string;
};

// Define the expected return type to match the API's structure
type GetMessagesResult = {
  messages: MessageThread[] | IMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  storage: {
    used: number;
    limit: number;
  };
};

const CACHE_REVALIDATION_PERIOD = 60;
function createCacheKey(userId: string, options: GetMessagesOptions): string {
  // Create a stable string representation of the options
  const optionsString = Object.entries(options)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // We'll use a simple prefix for easy identification and pattern matching
  return `cache:msg:${userId}:${optionsString}`;
}

// REMOVED unstable_cache wrapper
export const getMessagesForFolder = async (userId: string, options: GetMessagesOptions = {}): Promise<GetMessagesResult> => {
  await connectDB();

  // 1. Generate the unique cache key for this specific request
  const cacheKey = createCacheKey(userId, options);

  try {
    // 2. Check the Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`CACHE HIT for key: ${cacheKey}`);
      return JSON.parse(cachedData); // Return the cached result immediately
    }
  } catch (error) {
    console.error("Redis cache read error:", error);
    // If Redis fails, we proceed to fetch from DB without crashing
  }

  console.log(`CACHE MISS for key: ${cacheKey}. Fetching from MongoDB.`);

  const {
    folder = "inbox",
    page = 1,
    limit = 25,
    search = "",
    threadId,
    starred = false,
    unread = false,
    hasAttachments = false,
    priority = "",
    timeRange = "",
    startDate,
    endDate,
    sender = "",
    recipient = "",
    size = "",
    label = "",
  } = options;

  console.log(`DATABASE QUERY: Fetching messages for user ${userId}, options: ${JSON.stringify(options)}`);
  await connectDB();

  // Fetch storage details
  const userDetailsAggregation = await User.aggregate([
    { $match: { _id: new ObjectId(userId) } },
    { $lookup: { from: "organizations", localField: "org_id", foreignField: "_id", as: "org_data" } },
    { $unwind: { path: "$org_data", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "plans", localField: "org_data.plan_id", foreignField: "_id", as: "plan_data" } },
    { $unwind: { path: "$plan_data", preserveNullAndEmptyArrays: true } },
  ]);
  const userDetails = userDetailsAggregation[0];
  const usedStorageKB = userDetails?.plan_usage?.storage || 0;
  const usedStorageGB = usedStorageKB / (1024 * 1024);
  const storageLimitGB = userDetails?.plan_data?.limits?.storage || 0;
  const storageInfo = { used: usedStorageGB, limit: storageLimitGB };
  console.log(userDetails)

  // Handle drafts separately
  if (folder === "drafts") {
    const draftQuery: any = { user_id: userId };
    if (search) {
      draftQuery.$or = [
        { subject: { $regex: search, $options: "i" } },
        { to: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ];
    }
    const drafts = await Draft.find(draftQuery).sort({ updated_at: -1 }).skip((page - 1) * limit).limit(limit).populate("attachments");
    const total = await Draft.countDocuments(draftQuery);
    return {
      messages: JSON.parse(JSON.stringify(drafts)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      storage: storageInfo,
    };
  }

  // Build the main query using an $and operator
  const query: any = { user_id: new ObjectId(userId) };
  const conditions: any[] = [];

  if (threadId) {
    query.thread_id = threadId;
  } else if (folder === "starred") {
    conditions.push({ starred: true });
  } else {
    query.folder = folder;
  }

  if (starred) conditions.push({ starred: true });
  if (unread) conditions.push({ read: false });
  if (hasAttachments) conditions.push({ attachments: { $exists: true, $ne: [] } });
  if (priority) conditions.push({ priority: priority });
  if (sender) conditions.push({ from: { $regex: sender, $options: "i" } });
  if (recipient) conditions.push({ to: { $regex: recipient, $options: "i" } });
  if (label) conditions.push({ labels: label });

  if (timeRange) {
    const now = new Date();
    let dateCondition;
    switch (timeRange) {
      case "today": dateCondition = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lte: new Date(now.setHours(23, 59, 59, 999)) }; break;
      case "yesterday": const y = new Date(new Date().setDate(new Date().getDate() - 1)); dateCondition = { $gte: new Date(y.setHours(0, 0, 0, 0)), $lte: new Date(y.setHours(23, 59, 59, 999)) }; break;
      case "week": const w = new Date(new Date().setDate(new Date().getDate() - new Date().getDay())); dateCondition = { $gte: new Date(w.setHours(0, 0, 0, 0)) }; break;
      case "month": dateCondition = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }; break;
      case "3months": dateCondition = { $gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }; break;
      case "year": dateCondition = { $gte: new Date(now.getFullYear(), 0, 1) }; break;
      case "custom": if (startDate || endDate) { dateCondition = { ...(startDate && { $gte: new Date(startDate) }), ...(endDate && { $lte: new Date(endDate) }) } }; break;
    }
    if (dateCondition) conditions.push({ created_at: dateCondition });
  }

  if (size) {
    let sizeCondition;
    switch (size) {
      case "small": sizeCondition = { $lt: 1024 * 1024 }; break;
      case "medium": sizeCondition = { $gte: 1024 * 1024, $lt: 10 * 1024 * 1024 }; break;
      case "large": sizeCondition = { $gte: 10 * 1024 * 1024, $lt: 25 * 1024 * 1024 }; break;
      case "huge": sizeCondition = { $gte: 25 * 1024 * 1024 }; break;
    }
    if (sizeCondition) conditions.push({ size: sizeCondition });
  }

  if (search) {
    conditions.push({
      $or: [
        { subject: { $regex: search, $options: "i" } },
        { from: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (conditions.length > 0) {
    query.$and = conditions;
  }

  let messages;

  if (threadId) {
    messages = await Message.find(query).sort({ created_at: 1 }).populate("attachments");
  } else {
    const pipeline: PipelineStage[] = [
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

    const threads = await Message.aggregate(pipeline);
    messages = threads.map(thread => ({ ...(thread.latestMessage as IMessage), attachments: thread.populatedAttachments, messageCount: thread.messageCount, unreadCount: thread.unreadCount }));
  }

  const total = threadId
    ? await Message.countDocuments(query)
    : await Message.aggregate([{ $match: query }, { $group: { _id: "$thread_id" } }, { $count: "total" }]).then((result) => result[0]?.total || 0);

  const mongoResult = {
    messages: JSON.parse(JSON.stringify(messages)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    storage: storageInfo,
  };

  // 4. After getting the result from MongoDB, save it to the Redis cache
  try {
    const CACHE_TTL_SECONDS = 3600; // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(mongoResult), 'EX', CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Redis cache write error:", error);
  }

  // 5. Return the result from MongoDB
  return mongoResult;
}
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
