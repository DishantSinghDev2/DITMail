// types/index.ts
import { Types } from 'mongoose';

// User object available in the NextAuth.js session
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  org_id: string;
  mailboxAccess: boolean;
  onboarding: {
    completed: boolean;
  };
  plan: string;
}

// Shape of an attachment document from MongoDB
export interface Attachment {
  _id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// The core Message shape from MongoDB
export interface Message {
  _id: string;
  draftId?: string;
  user_id: Types.ObjectId;
  thread_id: string;
  subject: string;
  from: string;
  to: string[];
  isDraft: boolean;
  cc?: string[];
  bcc?: string[];
  text: string;
  html: string;
  read: boolean;
  status: "sent" | "received" | "draft" | "failed" | "queued";
  error?: string;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'trash' | 'archive' | 'spam';
  priority?: 'high' | 'low' | 'normal';
  attachments: Attachment[];
  labels?: string[];
  created_at: string; // ISO Date string
}

// The shape of aggregated thread data passed to the Message List
export interface MessageThread extends Message {
  messageCount: number;
  unreadCount: number;
}