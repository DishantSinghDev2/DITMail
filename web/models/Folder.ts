import mongoose from "mongoose"

const FolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  color: {
    type: String,
    default: "#3B82F6",
    match: /^#[0-9A-F]{6}$/i,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
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
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
})

// Compound indexes
FolderSchema.index({ user_id: 1, name: 1 }, { unique: true })
FolderSchema.index({ user_id: 1, created_at: 1 })

// Update timestamp on save
FolderSchema.pre("save", function (next) {
  this.updated_at = new Date()
  next()
})

export default mongoose.models.Folder || mongoose.model("Folder", FolderSchema)
