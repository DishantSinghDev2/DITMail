import mongoose, { Schema, type Document } from "mongoose"

export interface IPlan extends Document {
  name: string
  limits: {
    users: number
    domains: number
    storage: number // in GB
  }
  price: number
  customizable: boolean
  features: string[]
}

const PlanSchema = new Schema<IPlan>({
  name: { type: String, required: true },
  limits: {
    users: { type: Number, required: true },
    domains: { type: Number, required: true },
    storage: { type: Number, required: true }, // in GB
  },
  price: { type: Number, required: true },
  customizable: { type: Boolean, default: false },
  features: [String],
})

export default mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema)
