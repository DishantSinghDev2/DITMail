import { z } from "zod"

export const emailSchema = z.object({
  to: z.string().min(1, "At least one recipient is required"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  attachments: z.array(z.any()).optional(),
})

export const composeEmailSchema = z.object({
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  in_reply_to: z.string().optional(),
  references: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
})
