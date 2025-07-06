import mongoose, { Schema, type Document } from "mongoose"

export interface IDomain extends Document {
  domain: string
  org_id: mongoose.Types.ObjectId
  dkim_verified: boolean
  mx_verified: boolean
  spf_verified: boolean
  dmarc_verified: boolean
  verification_code?: string // Optional field for verification code
  ownership_verified: boolean // Optional field for ownership verification
  status: "pending" | "verified" | "failed"
  dkim_public_key: string
  dkim_private_key: string
  created_at: Date
}

const DomainSchema = new Schema<IDomain>({
  domain: { type: String, required: true, lowercase: true },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  dkim_verified: { type: Boolean, default: false },
  mx_verified: { type: Boolean, default: false },
  spf_verified: { type: Boolean, default: false },
  verification_code: { type: String, required: false },
  ownership_verified: { type: Boolean, default: false },
  dmarc_verified: { type: Boolean, default: false },
  status: { type: String, enum: ["pending", "verified", "failed"], default: "pending" },
  dkim_public_key: { type: String, required: true },
  dkim_private_key: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Domain || mongoose.model<IDomain>("Domain", DomainSchema)
