import mongoose, { Schema, type Document } from "mongoose"

export interface ICatchAll extends Document {
  domain_id: mongoose.Types.ObjectId
  destination: string
  org_id: mongoose.Types.ObjectId
  active: boolean
  created_at: Date
}

const CatchAllSchema = new Schema<ICatchAll>({
  domain_id: { type: Schema.Types.ObjectId, ref: "Domain", required: true, unique: true },
  destination: { type: String, required: true, lowercase: true },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.CatchAll || mongoose.model<ICatchAll>("CatchAll", CatchAllSchema)
