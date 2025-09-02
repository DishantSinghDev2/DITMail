import { Worker, Job } from "bullmq";
import SMTPConnection from "smtp-connection";
import { DKIMSign } from "node-dkim";
import mongoose from "mongoose";
import { config } from "dotenv";

// Configure dotenv
config({ path: ".env" });

// Import your Mongoose models
import Message from "../models/Message";
import Domain from "../models/Domain";
import AppPassword from "../models/AppPassword";
import { publishMailboxEvent } from "../lib/redis";

// --- DATABASE AND REDIS CONNECTION ---
async function initDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("MongoDB connected.");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

const redisConnection = {
  url: process.env.REDIS_URL || "",
};

type SMTPConn = InstanceType<typeof SMTPConnection>;

function connectSMTP(connection: SMTPConn): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.connect((err: any) => (err ? reject(err) : resolve()));
  });
}

function quitSMTP(connection: SMTPConn): Promise<void> {
  return new Promise((resolve) => {
    connection.quit(() => resolve());
  });
}

function sendSMTP(
  connection: SMTPConn,
  from: string,
  to: string[],
  raw: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.send({ from, to }, raw, (err: Error | null, info: any) => {
      if (err) return reject(err);
      console.log(`SMTP delivery successful: ${info.response}`);
      resolve();
    });
  });
}

// --- MAIL PROCESSOR ---
const mailProcessor = async (job: Job) => {
  const { messageId } = job.data;
  console.log(`Processing job ${job.id} for message: ${messageId}`);

  // Fetch the message and populate the user_id field
  const message = await Message.findById(messageId).populate("user_id");

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
    const fromDomain = message.from.split("@")[1];
    const domain = await Domain.findOne({
      domain: fromDomain,
      status: "verified",
    });

    if (!domain || !domain.dkim_private_key) {
      throw new Error(`Domain ${fromDomain} not verified or DKIM key missing.`);
    }

    // Build raw email
    let rawEmail = `X-Internal-Message-ID: ${message._id}\r\n`;
    rawEmail += `From: ${message.from}\r\n`;
    rawEmail += `To: ${message.to.join(", ")}\r\n`;
    if (message.cc?.length) rawEmail += `Cc: ${message.cc.join(", ")}\r\n`;
    rawEmail += `Subject: ${message.subject}\r\n`;
    rawEmail += `MIME-Version: 1.0\r\n`;
    rawEmail += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    rawEmail += message.html;

    // DKIM signing (insert before body)
    const dkimSignature = DKIMSign(rawEmail, {
      domainName: fromDomain,
      keySelector: domain.dkim_selector || "default",
      privateKey: domain.dkim_private_key,
    });

    const signedEmail = rawEmail.replace(
      /\r\n\r\n/,
      `\r\n${dkimSignature}\r\n\r\n`
    );

    // SMTP connection
    const connection = new SMTPConnection({
      host: process.env.SMTP_HOST!,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
    });

    await connectSMTP(connection);
    await connection.login({ user: user.email, pass: plainTextPassword });

    const recipients = [
      ...(message.to || []),
      ...(message.cc || []),
      ...(message.bcc || []),
    ];

    if (!recipients.length) {
      throw new Error("No recipients specified.");
    }

    await sendSMTP(connection, message.from, recipients, signedEmail);
    await quitSMTP(connection);

    console.log(`Email sent successfully for message: ${messageId}`);

    await Message.findByIdAndUpdate(message._id, { status: "sent" });

    for (const recipient of message.to || []) {
      await publishMailboxEvent(recipient, {
        type: "new_mail",
        message: { from: message.from, subject: message.subject },
      });
    }
  } catch (error: any) {
    console.error(`Failed to send email for job ${job.id}:`, error);
    if (message?._id) {
      await Message.findByIdAndUpdate(message._id, { status: "failed" });
    }
    throw error;
  }
};

// --- INITIALIZE AND RUN THE WORKER ---
async function startWorker() {
  await initDatabase();

  const worker = new Worker("mail-delivery-queue", mailProcessor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: { max: 100, duration: 10000 },
  });

  console.log("Mail worker started...");

  worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    if (job) {
      console.log(`Job ${job.id} has failed with ${err.message}`);
    } else {
      console.log(`A job has failed with ${err.message}`);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down worker...");
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startWorker().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
