import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.APP_ENCRYPTION_KEY!, 'base64'); // 32 bytes

// --- ENCRYPTION HELPERS ---
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- SCHEMA ---
export interface IAppPassword extends Document {
  user_id: mongoose.Schema.Types.ObjectId;
  name: string;
  encrypted_password: string;
  last_used?: Date;
  created_at: Date;
  decryptPassword(): string;
}

const AppPasswordSchema: Schema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  encrypted_password: { type: String, required: true },
  last_used: { type: Date },
  created_at: { type: Date, default: Date.now },
});

// Method to decrypt the password on a document instance
AppPasswordSchema.methods.decryptPassword = function(): string {
  return decrypt(this.encrypted_password);
};

// Hook to encrypt password before saving
AppPasswordSchema.pre<IAppPassword>('save', function (next) {
  if (this.isModified('encrypted_password')) {
    // This assumes the plain text is temporarily stored here before saving
    this.encrypted_password = encrypt(this.encrypted_password);
  }
  next();
});

const AppPassword = (mongoose.models.AppPassword || mongoose.model<IAppPassword>('AppPassword', AppPasswordSchema)) as Model<IAppPassword>;
export default AppPassword;