import mongoose, { Schema, type Document } from "mongoose"

export interface IBranding extends Document {
  org_id: mongoose.Types.ObjectId
  logo_url?: string
  primary_color: string
  secondary_color: string
  company_name: string
  custom_domain?: string
  email_footer: string
  login_background?: string
  created_at: Date
}

const BrandingSchema = new Schema<IBranding>({
  org_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
  logo_url: String,
  primary_color: { type: String, default: "#3B82F6" },
  secondary_color: { type: String, default: "#1E40AF" },
  company_name: { type: String, required: true },
  custom_domain: String,
  email_footer: { type: String, default: "" },
  login_background: String,
  created_at: { type: Date, default: Date.now },
})

export default mongoose.models.Branding || mongoose.model<IBranding>("Branding", BrandingSchema)
