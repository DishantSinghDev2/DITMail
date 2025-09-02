import { Worker, Job } from 'bullmq'; // Import the 'Job' type
import SMTPConnection from 'smtp-connection';
import { DKIMSign } from 'node-dkim';
import mongoose from 'mongoose';
import { config } from 'dotenv';

// Configure dotenv
config({ path: '.env' }); 

// Import your Mongoose models (These paths will work when compiling from the root)
import Message from '../models/Message';
import Domain from '../models/Domain';
import '../models/User'
import AppPassword from '../models/AppPassword'; 
import { publishMailboxEvent } from '../lib/redis'; 

// --- DATABASE AND REDIS CONNECTION ---
mongoose.connect(process.env.MONGO_URI!);

const redisConnection = {
  url: process.env.REDIS_URL || ''
};

// --- THE WORKER PROCESSOR (WITH TYPES) ---
const mailProcessor = async (job: Job) => { // <-- Add type 'Job' here
  const { messageId } = job.data;
  console.log(`Processing job ${job.id} for message: ${messageId}`);

  // Fetch the message and populate the user_id field
  const message = await Message.findById(messageId).populate('user_id');

  if (!message || !message.user_id) {
    throw new Error(`Message or associated User not found for ID: ${messageId}`);
  }

  // Type assertion to let TypeScript know user_id is populated
  const user = message.user_id as any; 

  const appPasswordDoc = await AppPassword.findOne({ user_id: user._id });
  if (!appPasswordDoc) {
    throw new Error(`No App Password configured for user ${user.email}`);
  }

  const plainTextPassword = appPasswordDoc.decryptPassword();

  try {
    const fromDomain = message.from.split("@")[1];
    const domain = await Domain.findOne({ domain: fromDomain, status: "verified" });

    if (!domain || !domain.dkim_private_key) {
      throw new Error(`Domain ${fromDomain} not verified or DKIM key missing.`);
    }

    let rawEmail = `X-Internal-Message-ID: ${message._id}\r\n`;
    rawEmail += `From: ${message.from}\r\n`;
    rawEmail += `To: ${message.to.join(", ")}\r\n`;
    if (message.cc?.length) rawEmail += `Cc: ${message.cc.join(", ")}\r\n`;
    rawEmail += `Subject: ${message.subject}\r\n`;
    rawEmail += `MIME-Version: 1.0\r\n`;
    rawEmail += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    rawEmail += message.html;

    const dkimSignature = DKIMSign(rawEmail, {
      domainName: fromDomain,
      keySelector: "default",
      privateKey: domain.dkim_private_key,
    });

    const signedEmail = dkimSignature + "\r\n" + rawEmail;

    const connection = new SMTPConnection({
      host: process.env.SMTP_HOST!,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
    });

    await connection.connect();
    await connection.login({ user: user.email, pass: plainTextPassword });
    
    const recipients = [...message.to, ...message.cc, ...message.bcc];

    await new Promise<void>((resolve, reject) => {
      // Add explicit types for the callback parameters
      connection.send({ from: message.from, to: recipients }, signedEmail, (err: Error | null, info: any) => {
        if (err) return reject(err);
        console.log(`SMTP delivery successful: ${info.response}`);
        resolve();
      });
    });

    await connection.quit();
    
    console.log(`Email sent successfully for message: ${messageId}`);
    
    await Message.findByIdAndUpdate(message._id, { status: "sent" });

    for (const recipient of message.to) {
        await publishMailboxEvent(recipient, { type: 'new_mail', message: { from: message.from, subject: message.subject } });
    }

  } catch (error: any) { // <-- Add type 'any' or 'Error'
    console.error(`Failed to send email for job ${job.id}:`, error);
    await Message.findByIdAndUpdate(message._id, { status: "failed" });
    throw error;
  }
};

// --- INITIALIZE AND RUN THE WORKER ---
const worker = new Worker('mail-delivery-queue', mailProcessor, {
  connection: redisConnection,
  concurrency: 5,
  limiter: { max: 100, duration: 10000 },
});

console.log("Mail worker started...");

worker.on('completed', (job: Job) => { // <-- Add type 'Job'
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => { // <-- Add types
  if (job) {
    console.log(`Job ${job.id} has failed with ${err.message}`);
  } else {
    console.log(`A job has failed with ${err.message}`);
  }
});