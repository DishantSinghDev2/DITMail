import connectDB from "./db"
import User from "@/models/User"
import Domain from "@/models/Domain"
import Message from "@/models/Message"
import Organization from "@/models/Organization"
import { AppError } from "./error-handler"

export interface PlanLimits {
  users: number
  domains: number
  emailsPerDay: number
  emailsPerMonth: number
  storageGB: number
  attachmentSizeMB: number
  customBranding: boolean
  aliases: number
  apiCalls: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    users: 1,
    domains: 1,
    emailsPerDay: 100,
    emailsPerMonth: 1000,
    storageGB: 1,
    attachmentSizeMB: 10,
    customBranding: false,
    aliases: 5,
    apiCalls: 1000,
  },
  pro: {
    users: 25,
    domains: 5,
    emailsPerDay: 1000,
    emailsPerMonth: 25000,
    storageGB: 50,
    attachmentSizeMB: 25,
    customBranding: true,
    aliases: 100,
    apiCalls: 10000,
  },
  enterprise: {
    users: -1, // Unlimited
    domains: -1,
    emailsPerDay: -1,
    emailsPerMonth: -1,
    storageGB: -1,
    attachmentSizeMB: 100,
    customBranding: true,
    aliases: -1,
    apiCalls: -1,
  },
}

export async function checkPlanLimits(orgId: string, action: string, additionalCount = 1, metadata?: any) {
  await connectDB()

  const org = await Organization.findById(orgId).populate("plan_id")
  if (!org || !org.plan_id) {
    throw new AppError("Organization or plan not found", 404)
  }

  const planName = org.plan_id.name.toLowerCase()
  const limits = PLAN_LIMITS[planName]

  if (!limits) {
    throw new AppError("Invalid plan configuration", 500)
  }

  const currentUsage = await getCurrentUsage(orgId)

  switch (action) {
    case "add_user":
      if (limits.users !== -1 && currentUsage.users + additionalCount > limits.users) {
        throw new AppError(`User limit exceeded. Your ${org.plan_id.name} plan allows ${limits.users} users.`, 403)
      }
      break

    case "add_domain":
      if (limits.domains !== -1 && currentUsage.domains + additionalCount > limits.domains) {
        throw new AppError(
          `Domain limit exceeded. Your ${org.plan_id.name} plan allows ${limits.domains} domains.`,
          403,
        )
      }
      break

    case "send_email":
      if (limits.emailsPerDay !== -1 && currentUsage.emailsToday + additionalCount > limits.emailsPerDay) {
        throw new AppError(
          `Daily email limit exceeded. Your ${org.plan_id.name} plan allows ${limits.emailsPerDay} emails per day.`,
          429,
        )
      }
      if (limits.emailsPerMonth !== -1 && currentUsage.emailsThisMonth + additionalCount > limits.emailsPerMonth) {
        throw new AppError(
          `Monthly email limit exceeded. Your ${org.plan_id.name} plan allows ${limits.emailsPerMonth} emails per month.`,
          429,
        )
      }
      break

    case "upload_attachment":
      const fileSizeMB = metadata?.fileSize ? metadata.fileSize / (1024 * 1024) : 0
      if (fileSizeMB > limits.attachmentSizeMB) {
        throw new AppError(
          `File too large. Your ${org.plan_id.name} plan allows attachments up to ${limits.attachmentSizeMB}MB.`,
          413,
        )
      }
      break

    case "storage":
      const storageLimitBytes =
        limits.storageGB === -1 ? Number.POSITIVE_INFINITY : limits.storageGB * 1024 * 1024 * 1024
      if (currentUsage.storageUsed + additionalCount > storageLimitBytes) {
        throw new AppError(
          `Storage limit exceeded. Your ${org.plan_id.name} plan allows ${limits.storageGB}GB of storage.`,
          413,
        )
      }
      break

    case "add_alias":
      if (limits.aliases !== -1 && currentUsage.aliases + additionalCount > limits.aliases) {
        throw new AppError(`Alias limit exceeded. Your ${org.plan_id.name} plan allows ${limits.aliases} aliases.`, 403)
      }
      break

    case "custom_branding":
      if (!limits.customBranding) {
        throw new AppError("Custom branding requires Pro or Enterprise plan.", 403)
      }
      break

    case "api_call":
      if (limits.apiCalls !== -1 && currentUsage.apiCallsToday + additionalCount > limits.apiCalls) {
        throw new AppError(
          `API rate limit exceeded. Your ${org.plan_id.name} plan allows ${limits.apiCalls} API calls per day.`,
          429,
        )
      }
      break

    default:
      break
  }

  return true
}

async function getCurrentUsage(orgId: string) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [users, domains, emailsToday, emailsThisMonth, storageUsed, aliases, apiCallsToday] = await Promise.all([
    User.countDocuments({ org_id: orgId }),
    Domain.countDocuments({ org_id: orgId }),
    Message.countDocuments({
      org_id: orgId,
      status: "sent",
      created_at: { $gte: startOfDay },
    }),
    Message.countDocuments({
      org_id: orgId,
      status: "sent",
      created_at: { $gte: startOfMonth },
    }),
    Message.aggregate([{ $match: { org_id: orgId } }, { $group: { _id: null, totalSize: { $sum: "$size" } } }]).then(
      (result) => result[0]?.totalSize || 0,
    ),
    // Aliases count would be added here
    0, // aliases placeholder
    // API calls tracking would be implemented
    0, // apiCallsToday placeholder
  ])

  return {
    users,
    domains,
    emailsToday,
    emailsThisMonth,
    storageUsed,
    aliases,
    apiCallsToday,
  }
}

export async function getUsageStats(orgId: string) {
  await connectDB()

  const org = await Organization.findById(orgId).populate("plan_id")
  if (!org) {
    throw new AppError("Organization not found", 404)
  }

  const planName = org.plan_id.name.toLowerCase()
  const limits = PLAN_LIMITS[planName]
  const currentUsage = await getCurrentUsage(orgId)

  return {
    plan: {
      name: org.plan_id.name,
      limits,
    },
    usage: currentUsage,
    percentages: {
      users: limits.users === -1 ? 0 : (currentUsage.users / limits.users) * 100,
      domains: limits.domains === -1 ? 0 : (currentUsage.domains / limits.domains) * 100,
      storage: limits.storageGB === -1 ? 0 : (currentUsage.storageUsed / (limits.storageGB * 1024 * 1024 * 1024)) * 100,
      emailsToday: limits.emailsPerDay === -1 ? 0 : (currentUsage.emailsToday / limits.emailsPerDay) * 100,
      emailsThisMonth: limits.emailsPerMonth === -1 ? 0 : (currentUsage.emailsThisMonth / limits.emailsPerMonth) * 100,
    },
  }
}
