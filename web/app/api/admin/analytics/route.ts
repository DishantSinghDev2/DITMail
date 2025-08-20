import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Message from "@/models/Message"
import User from "@/models/User"
import Domain from "@/models/Domain"
import { asyncHandler } from "@/lib/error-handler"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export const GET = asyncHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "30d" // 7d, 30d, 90d, 1y
  const timezone = searchParams.get("timezone") || "UTC"

  await connectDB()

  const periodDays = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  }

  const days = periodDays[period] || 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Email volume analytics
  const emailVolumeData = await Message.aggregate([
    {
      $match: {
        org_id: user.org_id,
        created_at: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ])

  // Top senders/receivers
  const topSenders = await Message.aggregate([
    {
      $match: {
        org_id: user.org_id,
        created_at: { $gte: startDate },
        status: "sent",
      },
    },
    {
      $group: {
        _id: "$from",
        count: { $sum: 1 },
        totalSize: { $sum: "$size" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  const topReceivers = await Message.aggregate([
    {
      $match: {
        org_id: user.org_id,
        created_at: { $gte: startDate },
        status: "received",
      },
    },
    { $unwind: "$to" },
    {
      $group: {
        _id: "$to",
        count: { $sum: 1 },
        totalSize: { $sum: "$size" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])

  // Domain performance
  const domainStats = await Domain.aggregate([
    {
      $match: { org_id: user.org_id },
    },
    {
      $lookup: {
        from: "messages",
        let: { domain: "$domain" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$org_id", user.org_id] },
                  { $gte: ["$created_at", startDate] },
                  { $regexMatch: { input: "$from", regex: { $concat: ["@", "$$domain"] } } },
                ],
              },
            },
          },
        ],
        as: "messages",
      },
    },
    {
      $project: {
        domain: 1,
        status: 1,
        messageCount: { $size: "$messages" },
        totalSize: { $sum: "$messages.size" },
      },
    },
  ])

  // User activity
  const userActivity = await User.aggregate([
    {
      $match: { org_id: user.org_id },
    },
    {
      $lookup: {
        from: "messages",
        let: { userEmail: "$email" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$org_id", user.org_id] },
                  { $gte: ["$created_at", startDate] },
                  { $eq: ["$from", "$$userEmail"] },
                ],
              },
            },
          },
        ],
        as: "sentMessages",
      },
    },
    {
      $lookup: {
        from: "messages",
        let: { userEmail: "$email" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$org_id", user.org_id] },
                  { $gte: ["$created_at", startDate] },
                  { $in: ["$$userEmail", "$to"] },
                ],
              },
            },
          },
        ],
        as: "receivedMessages",
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        sentCount: { $size: "$sentMessages" },
        receivedCount: { $size: "$receivedMessages" },
        totalActivity: { $add: [{ $size: "$sentMessages" }, { $size: "$receivedMessages" }] },
      },
    },
    { $sort: { totalActivity: -1 } },
  ])

  // Storage usage over time
  const storageUsage = await Message.aggregate([
    {
      $match: {
        org_id: user.org_id,
        created_at: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
        dailySize: { $sum: "$size" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $group: {
        _id: null,
        data: {
          $push: {
            date: "$_id",
            size: "$dailySize",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        data: {
          $reduce: {
            input: "$data",
            initialValue: { total: 0, result: [] },
            in: {
              total: { $add: ["$$value.total", "$$this.size"] },
              result: {
                $concatArrays: [
                  "$$value.result",
                  [
                    {
                      date: "$$this.date",
                      dailySize: "$$this.size",
                      cumulativeSize: { $add: ["$$value.total", "$$this.size"] },
                    },
                  ],
                ],
              },
            },
          },
        },
      },
    },
  ])

  const analytics = {
    period,
    startDate,
    endDate: new Date(),
    emailVolume: emailVolumeData,
    topSenders,
    topReceivers,
    domainStats,
    userActivity,
    storageUsage: storageUsage[0]?.data.result || [],
  }

  return NextResponse.json({ analytics })
})
