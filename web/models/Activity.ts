// /models/Activity.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for an Activity document
export interface IActivity extends Document {
  org_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId; // Optional: Link to a User
  user_name: string; // Or simply store the user's name
  action: string; // e.g., 'User Created', 'Domain Verified', 'Message Sent'
  details?: object; // Optional: Store additional JSON data related to the action
  timestamp: Date;
}

// Define the Mongoose schema
const ActivitySchema: Schema = new Schema({
  org_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  user_name: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed }, // Use Mixed for flexible JSON objects
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false } // Use 'timestamp' for creation
});

// Create and export the model
const Activity = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
export default Activity;