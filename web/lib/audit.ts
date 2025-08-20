import {connectDB} from "./db"
import AuditLog from "@/models/AuditLog"
import { captureMessage } from "./sentry"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export interface AuditEvent {
  user_id: string
  action: string
  details?: any
  ip: string
  user_agent?: string
  resource_type?: string
  resource_id?: string
  org_id?: string
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    await connectDB()

    const auditLog = new AuditLog({
      user_id: event.user_id,
      action: event.action,
      details: event.details,
      ip: event.ip,
      user_agent: event.user_agent,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      org_id: event.org_id,
    })

    await auditLog.save()

    // Also log to Sentry for monitoring
    captureMessage(`Audit: ${event.action}`, "info")
  } catch (error) {
    console.error("Audit logging error:", error)
    // Don't throw error to avoid breaking the main operation
  }
}

// Predefined audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",
  USER_REGISTER: "user_register",
  PASSWORD_CHANGE: "password_change",

  // User Management
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  USER_ROLE_CHANGED: "user_role_changed",

  // Email Actions
  EMAIL_SENT: "email_sent",
  EMAIL_RECEIVED: "email_received",
  EMAIL_READ: "email_read",
  EMAIL_DELETED: "email_deleted",
  EMAIL_STARRED: "email_starred",
  DRAFT_SAVED: "draft_saved",
  DRAFT_DELETED: "draft_deleted",

  // Domain Management
  DOMAIN_ADDED: "domain_added",
  DOMAIN_VERIFIED: "domain_verified",
  DOMAIN_DELETED: "domain_deleted",
  DNS_VERIFICATION_CHECK: "dns_verification_check",

  // Organization
  ORG_CREATED: "org_created",
  ORG_UPDATED: "org_updated",
  ORG_PLAN_CHANGED: "org_plan_changed",

  // Aliases & Catch-all
  ALIAS_CREATED: "alias_created",
  ALIAS_UPDATED: "alias_updated",
  ALIAS_DELETED: "alias_deleted",
  CATCHALL_CREATED: "catchall_created",
  CATCHALL_UPDATED: "catchall_updated",
  CATCHALL_DELETED: "catchall_deleted",

  // File Management
  FILE_UPLOADED: "file_uploaded",
  FILE_DOWNLOADED: "file_downloaded",
  FILE_DELETED: "file_deleted",

  // Settings
  SIGNATURE_CREATED: "signature_created",
  SIGNATURE_UPDATED: "signature_updated",
  SIGNATURE_DELETED: "signature_deleted",
  BRANDING_UPDATED: "branding_updated",

  // Security
  LOGIN_FAILED: "login_failed",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  UNAUTHORIZED_ACCESS: "unauthorized_access",

  // System
  SYSTEM_BACKUP: "system_backup",
  SYSTEM_MAINTENANCE: "system_maintenance",
  PLAN_LIMIT_EXCEEDED: "plan_limit_exceeded",
}

// Helper function to extract request info
export function getRequestInfo(request: any) {
  return {
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  }
}

// Middleware to automatically log API calls
export function withAuditLog(action: string, resourceType?: string) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const request = args[0]
      const user = await getServerSession(authOptions)

      if (user) {
        const requestInfo = getRequestInfo(request)

        await logAuditEvent({
          user_id: user._id.toString(),
          action,
          resource_type: resourceType,
          org_id: user.org_id.toString(),
          ...requestInfo,
        })
      }

      return method.apply(this, args)
    }

    return descriptor
  }
}
