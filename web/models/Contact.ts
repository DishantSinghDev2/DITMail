import mongoose from "mongoose"

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  organization: {
    type: String,
    trim: true,
    default: "",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  last_contacted: {
    type: Date,
    default: Date.now,
    index: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
})

// Compound indexes for efficient queries
ContactSchema.index({ user_id: 1, email: 1 }, { unique: true })
ContactSchema.index({ user_id: 1, last_contacted: -1 })
ContactSchema.index({ user_id: 1, name: "text", email: "text" })

// Update timestamp on save
ContactSchema.pre("save", function (next) {
  this.updated_at = new Date()
  next()
})

export default mongoose.models.Contact || mongoose.model("Contact", ContactSchema)
