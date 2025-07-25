import mongoose, { Schema, type Document } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  email: string
  mailboxAccess: boolean
  name: string
  password_hash: string
  org_id: mongoose.Types.ObjectId
  role: "owner" | "admin" | "user"
  dkim_selector: string
  onboarding?: {
    completed: boolean
    startedAt: Date
  }
  plan_usage: {
    users: number
    domains: number
    storage: number
  }
  created_at: Date
  comparePassword(password: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  mailboxAccess: { type: Boolean, required: true, default: false},
  name: { type: String, required: true },
  password_hash: { type: String, required: true },
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  role: { type: String, enum: ["owner", "admin", "user"], default: "user" },
  dkim_selector: { type: String, default: () => Math.random().toString(36).substring(7) },
  onboarding: {
    completed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
  },
  created_at: { type: Date, default: Date.now },
  plan_usage: {
    users: { type: Number, default: 0 },
    domains: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
  },
})

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password_hash)
}

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password_hash")) return next()
  this.password_hash = await bcrypt.hash(this.password_hash, 12)
  next()
})

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
