// models/AppPassword.ts

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ensure this is loaded exactly the same way in your worker and Haraka plugin
const ENCRYPTION_KEY = Buffer.from(process.env.APP_ENCRYPTION_KEY!, 'base64');

// --- ENCRYPTION HELPERS (These are correct) ---
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length < 2) {
      // Added a guard clause to prevent errors on invalid data
      throw new Error("Invalid encrypted text format. Expected 'iv:encryptedText'.");
  }
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
  encrypted_password: string; // This will ONLY store encrypted data
  password: string; // <-- VIRTUAL field for setting the plain-text password
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

// --- VIRTUAL FIELD FOR SAFER PASSWORD SETTING ---
AppPasswordSchema.virtual('password')
  .set(function(this: IAppPassword, plainText: string) {
    // When a user sets `doc.password = '...'`, this code runs.
    // It encrypts the value and stores it in the REAL `encrypted_password` field.
    this.encrypted_password = encrypt(plainText);
  });

// --- REMOVE THE FLAWED pre('save') HOOK ---
// AppPasswordSchema.pre<IAppPassword>('save', function (next) { ... }); // DELETE THIS

// Method to decrypt the password on a document instance
AppPasswordSchema.methods.decryptPassword = function(): string {
  // Add a check to ensure the field exists before trying to decrypt
  if (!this.encrypted_password) {
      return '';
  }
  return decrypt(this.encrypted_password);
};

const AppPassword = (mongoose.models.AppPassword || mongoose.model<IAppPassword>('AppPassword', AppPasswordSchema)) as Model<IAppPassword>;
export default AppPassword;