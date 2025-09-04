import mongoose, { Schema, type Document } from "mongoose"

export interface IAttachment extends Document {
  filename: string
  mimeType: string
  user_id: mongoose.Types.ObjectId
  gridfs_id: mongoose.Types.ObjectId
  message_id: mongoose.Types.ObjectId
  size: number
  created_at: Date
}

const AttachmentSchema = new Schema<IAttachment>({
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  gridfs_id: { type: Schema.Types.ObjectId, required: true },
  message_id: { type: Schema.Types.ObjectId, ref: "Message", required: true },
  size: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Attachment || mongoose.model<IAttachment>("Attachment", AttachmentSchema)
