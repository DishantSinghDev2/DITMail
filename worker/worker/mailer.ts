import { Worker, Job } from 'bullmq';
import SMTPConnection from 'smtp-connection';
import { DKIMSign } from 'node-dkim';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import MailComposer from 'mailcomposer';

// Configured dotenv
config({ path: '.env' });

// Import your Mongoose models
import Message from '../models/Message';
import Domain from '../models/Domain';
import '../models/User';
import Attachment from '../models/Attachment';
import AppPassword from '../models/AppPassword';
import { publishMailboxEvent } from '../lib/redis';

mongoose.connect(process.env.MONGO_URI!);

const redisConnection = {
  url: process.env.REDIS_URL || '',
};

function connectAsync(connection: InstanceType<typeof SMTPConnection>): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.connect((err?: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function loginAsync(connection: InstanceType<typeof SMTPConnection>, auth: { user: string; pass: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.login(auth, (err?: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function quitAsync(connection: InstanceType<typeof SMTPConnection>): Promise<void> {
  return new Promise((resolve) => {
    connection.quit();
    connection.on("end", () => resolve());
  });
}

async function downloadFromGridFS(bucket: GridFSBucket, fileId: mongoose.Types.ObjectId): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    downloadStream.on('error', (err) => {
      reject(err);
    });
  });
}


// --- THE Mail procc ---
const mailProcessor = async (job: Job) => {
  const { messageId } = job.data;
  console.log(`Processing job ${job.id} for message: ${messageId}`);

  const db = mongoose.connection.db;
  const attachmentBucket = new GridFSBucket(db, { bucketName: 'attachments' }); 

  const message = await Message.findById(messageId)
    .populate('user_id')
    .populate('attachments'); // This populates based on your schema

  if (!message || !message.user_id) {
    throw new Error(`Message or associated User not found for ID: ${messageId}`);
  }

  const user = message.user_id as any;

  const appPasswordDoc = await AppPassword.findOne({ user_id: user._id });
  if (!appPasswordDoc) {
    throw new Error(`No App Password configured for user ${user.email}`);
  }

  const plainTextPassword = appPasswordDoc.decryptPassword();

  try {
    const fromDomain = message.from.split('@')[1];
    const domain = await Domain.findOne({ domain: fromDomain, status: 'verified' });

    if (!domain || !domain.dkim_private_key) {
      throw new Error(`Domain ${fromDomain} not verified or DKIM key missing.`);
    }

    const mailOptions: MailComposer.Options = {
      from: message.from,
      to: message.to,
      subject: message.subject,
      // --- ADDED: Ensure valid HTML and provide text fallback ---
      html: message.html || "<html><body></body></html>",
      text: message.text || "This email is in HTML format.",
    };

    if (message.cc?.length) mailOptions.cc = message.cc;
    if (message.bcc?.length) mailOptions.bcc = message.bcc;

    // --- NEW: Fetch attachment content from gridfs ---
    if (message.attachments && message.attachments.length > 0) {
      const attachmentPromises = message.attachments.map(async (att: any) => {
        console.log(`Downloading attachment ${att.filename} from GridFS ID: ${att.gridfs_id}`);
        const contentBuffer = await downloadFromGridFS(attachmentBucket, att.gridfs_id);
        return {
          filename: att.filename,
          content: contentBuffer,
          contentType: att.mimeType,
        };
      });

      mailOptions.attachments = await Promise.all(attachmentPromises);
    }

    const mail = new MailComposer(mailOptions);
    const rawEmailStream = mail.compile().createReadStream();

    const rawEmail = await new Promise<string>((resolve, reject) => {
      let body = '';
      rawEmailStream.on('data', (chunk) => (body += chunk.toString()));
      rawEmailStream.on('end', () => resolve(body));
      rawEmailStream.on('error', reject);
    });


    // DKIM signing
    const dkimSignature = DKIMSign(rawEmail, {
      domainName: fromDomain,
      keySelector: 'default',
      privateKey: domain.dkim_private_key,
    });

    const signedEmail = dkimSignature + '\r\n' + rawEmail;

    // Create SMTP connection
    const connection = new SMTPConnection({
      host: process.env.SMTP_HOST!,
      port: Number.parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
    });

    await connectAsync(connection);
    console.log("Trying login with:", user.email, plainTextPassword.slice(0, 3) + "****");

    await loginAsync(connection, { user: user.email, pass: plainTextPassword });

    const recipients = [...message.to, ...message.cc, ...message.bcc];

    await new Promise<void>((resolve, reject) => {
      connection.send({ from: message.from, to: recipients }, signedEmail, (err: Error | null, info: any) => {
        if (err) return reject(err);
        console.log(`SMTP delivery successful: ${info.response}`);
        resolve();
      });
    });

    await quitAsync(connection);

    console.log(`Email sent successfully for message: ${messageId}`);
    await Message.findByIdAndUpdate(message._id, { status: 'sent' });

    // Publish mailbox events
    for (const recipient of message.to) {
      await publishMailboxEvent(recipient, {
        type: 'new_mail',
        message: { from: message.from, subject: message.subject },
      });
    }
  } catch (error: any) {
    console.error(`Failed to send email for job ${job.id}:`, error);
    await Message.findByIdAndUpdate(message._id, { status: 'failed' });
    throw error;
  }
};

// --- INITIALIZE AND RUN THE WORKER ---
const worker = new Worker('mail-delivery-queue', mailProcessor, {
  connection: redisConnection,
  concurrency: 5,
  limiter: { max: 100, duration: 10000 },
});

console.log('Mail worker started...');

worker.on('completed', (job: Job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.log(`Job ${job.id} has failed with ${err.message}`);
  } else {
    console.log(`A job has failed with ${err.message}`);
  }
});
