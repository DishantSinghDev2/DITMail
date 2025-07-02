import mongoose, { Schema, type Document } from "mongoose";

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  timezone: string;
  language: string;
  theme: string;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  createdAt: Date;
}

const ProfileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  timezone: { type: String, default: "UTC" },
  language: { type: String, default: "en" },
  theme: { type: String, default: "light" },
  emailNotifications: { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);