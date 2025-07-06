import mongoose, { Schema, type Document } from "mongoose"

export interface IMessage extends Document {
  message_id: string
  in_reply_to?: string
  references?: string[]
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text?: string
  attachments: mongoose.Types.ObjectId[]
  status: "sent" | "received" | "draft" | "failed" | "queued"
  folder: "inbox" | "sent" | "trash" | "drafts" | "spam"
  org_id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  read: boolean
  starred: boolean
  important: boolean
  thread_id: string
  labels: string[]
  size: number
  spam_score?: number
  encryption_status?: "none" | "encrypted" | "signed"
  delivery_status?: "delivered" | "bounced" | "deferred"
  created_at: Date
  sent_at?: Date
  received_at?: Date
  read_at?: Date
  headers: Map<string, string>
  search_text: string // For full-text search
}

const MessageSchema = new Schema<IMessage>({
  message_id: { type: String, required: true, unique: true },
  in_reply_to: String,
  references: [String],
  from: { type: String, required: true, lowercase: true },
  to: [{ type: String, required: true, lowercase: true }],
  cc: [{ type: String, lowercase: true }],
  bcc: [{ type: String, lowercase: true }],
  subject: { type: String, required: true },
  html: { type: String, required: true },
  text: String,
  attachments: [{ type: Schema.Types.ObjectId, ref: "Attachment" }],
  status: {
    type: String,
    enum: ["sent", "received", "draft", "failed", "queued"],
    default: "received",
  },
  folder: {
    type: String,
    enum: ["inbox", "sent", "trash", "drafts", "spam", "starred"],
    default: "inbox",
  },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  read: { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  important: { type: Boolean, default: false },
  thread_id: { type: String, required: true },
  labels: [String],
  size: { type: Number, default: 0 },
  spam_score: { type: Number, default: 0 },
  encryption_status: { type: String, enum: ["none", "encrypted", "signed"], default: "none" },
  delivery_status: { type: String, enum: ["delivered", "bounced", "deferred"] },
  created_at: { type: Date, default: Date.now },
  sent_at: Date,
  received_at: Date,
  read_at: Date,
  headers: { type: Map, of: String },
  search_text: { type: String, index: true },
})

// Comprehensive indexing for performance
MessageSchema.index({ user_id: 1, folder: 1, created_at: -1 })
MessageSchema.index({ thread_id: 1, created_at: 1 })
MessageSchema.index({ from: 1, created_at: -1 })
MessageSchema.index({ org_id: 1, created_at: -1 })
MessageSchema.index({ status: 1, created_at: -1 })
MessageSchema.index({ read: 1, user_id: 1 })
MessageSchema.index({ starred: 1, user_id: 1 })
MessageSchema.index({ important: 1, user_id: 1 })
MessageSchema.index({ labels: 1, user_id: 1 })

// Full-text search index
MessageSchema.index(
  {
    subject: "text",
    text: "text",
    search_text: "text",
    from: "text",
  },
  {
    weights: {
      subject: 10,
      from: 5,
      text: 1,
      search_text: 1,
    },
  },
)

// Pre-save middleware to generate search text
MessageSchema.pre("save", function (next) {
  this.search_text = `${this.subject} ${this.from} ${this.to.join(" ")} ${this.text || ""}`
  next()
})

// Update read_at when message is marked as read
MessageSchema.pre("save", function (next) {
  if (this.isModified("read") && this.read && !this.read_at) {
    this.read_at = new Date()
  }
  next()
})

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema)
