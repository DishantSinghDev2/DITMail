import mongoose, { Schema, type Document } from "mongoose"

export interface IEmailSignature extends Document {
  user_id: mongoose.Types.ObjectId
  name: string
  html: string
  text: string
  is_default: boolean
  created_at: Date
}

const EmailSignatureSchema = new Schema<IEmailSignature>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  html: { type: String, required: true },
  text: { type: String, required: true },
  is_default: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
})

EmailSignatureSchema.index({ user_id: 1 })

export default mongoose.models.EmailSignature || mongoose.model<IEmailSignature>("EmailSignature", EmailSignatureSchema)
