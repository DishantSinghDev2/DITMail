import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Message from "@/models/Message"
import { getAuthUser } from "@/lib/auth"
import Draft from "@/models/Draft"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get counts for all default folders
    const [inboxCounts, sentCounts, draftsCounts, starredCounts, archiveCounts, spamCounts, trashCounts] =
      await Promise.all([
        Message.aggregate([
          { $match: { user_id: user._id, folder: "inbox" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Message.aggregate([
          { $match: { user_id: user._id, folder: "sent" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Draft.aggregate([
          { $match: { user_id: user._id, type: "d" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Message.aggregate([
          { $match: { user_id: user._id, starred: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Message.aggregate([
          { $match: { user_id: user._id, folder: "archive" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Message.aggregate([
          { $match: { user_id: user._id, folder: "spam" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
        Message.aggregate([
          { $match: { user_id: user._id, folder: "trash" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            },
          },
        ]),
      ])

    const counts = {
      inbox: inboxCounts[0] || { total: 0, unread: 0 },
      sent: sentCounts[0] || { total: 0, unread: 0 },
      drafts: draftsCounts[0] || { total: 0, unread: 0 },
      starred: starredCounts[0] || { total: 0, unread: 0 },
      archive: archiveCounts[0] || { total: 0, unread: 0 },
      spam: spamCounts[0] || { total: 0, unread: 0 },
      trash: trashCounts[0] || { total: 0, unread: 0 },
    }

    return NextResponse.json({ counts })
  } catch (error) {
    console.error("Message counts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
