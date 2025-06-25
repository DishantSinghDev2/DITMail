import mongoose, { Schema, type Document } from "mongoose"

export interface IOrganization extends Document {
  name: string
  plan_id: mongoose.Types.ObjectId
  created_at: Date
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  plan_id: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema)
