import mongoose, { Schema, type Document } from "mongoose"

export interface IAuditLog extends Document {
  user_id: mongoose.Types.ObjectId
  action: string
  details: any
  ip: string
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  ip: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
