import mongoose, { Schema, type Document } from "mongoose"

export interface IDraft extends Document {
  user_id: mongoose.Types.ObjectId
  type: "d" | "r" | "f" // d = draft, r = reply, f = forward
  in_reply_to_id?: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text?: string
  attachments: mongoose.Types.ObjectId[]
  signature?: string
  autosaved_at: Date
  created_at: Date
  updated_at: Date
}

const DraftSchema = new Schema<IDraft>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["d", "r", "f"], default: "d" }, // d = draft, r = reply, f = forward
  in_reply_to_id: { type: String, default: "" },
  to: [{ type: String, lowercase: true }],
  cc: [{ type: String, lowercase: true }],
  bcc: [{ type: String, lowercase: true }],
  subject: { type: String, default: "" },
  html: { type: String, default: "" },
  text: String,
  attachments: [{ type: Schema.Types.ObjectId, ref: "Attachment" }],
  signature: String,
  autosaved_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

DraftSchema.index({ user_id: 1, updated_at: -1 })

export default mongoose.models.Draft || mongoose.model<IDraft>("Draft", DraftSchema)
