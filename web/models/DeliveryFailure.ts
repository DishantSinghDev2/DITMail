import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryFailure extends Document {
  original_message_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  org_id: mongoose.Types.ObjectId;
  failed_recipient: string;
  status_code?: number;
  diagnostic_code?: string;
  reason: string;
  is_hard_bounce: boolean;
  created_at: Date;
}

const DeliveryFailureSchema = new Schema<IDeliveryFailure>({
  original_message_id: { type: Schema.Types.ObjectId, ref: "Message", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  failed_recipient: { type: String, required: true, lowercase: true },
  status_code: Number,
  diagnostic_code: String,
  reason: { type: String, required: true },
  is_hard_bounce: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

DeliveryFailureSchema.index({ user_id: 1, created_at: -1 });
DeliveryFailureSchema.index({ failed_recipient: 1 });

export default mongoose.models.DeliveryFailure || mongoose.model<IDeliveryFailure>("DeliveryFailure", DeliveryFailureSchema);