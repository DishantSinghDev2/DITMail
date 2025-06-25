import mongoose, { Schema, type Document } from "mongoose"

export interface IAlias extends Document {
  alias: string
  destination: string[]
  domain_id: mongoose.Types.ObjectId
  org_id: mongoose.Types.ObjectId
  active: boolean
  created_at: Date
}

const AliasSchema = new Schema<IAlias>({
  alias: { type: String, required: true, lowercase: true },
  destination: [{ type: String, required: true, lowercase: true }],
  domain_id: { type: Schema.Types.ObjectId, ref: "Domain", required: true },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

AliasSchema.index({ alias: 1, domain_id: 1 }, { unique: true })

export default mongoose.models.Alias || mongoose.model<IAlias>("Alias", AliasSchema)
