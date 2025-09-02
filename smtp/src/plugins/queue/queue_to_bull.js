// plugins/queue_to_bull.js
const { Queue } = require('bullmq');
const { MongoClient } = require('mongodb');
const { simpleParser, MailParser } = require('mailparser'); // choose parser in code paths
const { Readable } = require('stream');
const fs = require('fs');
const os = require('os');
const path = require('path');

let mongoClient = null;
let mailQueue = null;
let ready = false;

const WORKER_IPS = ['127.0.0.1', '::1'];

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        // Catch synchronous errors
        try {
            stream.on('data', (c) => chunks.push(c));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        } catch (err) {
            reject(err); // catch non-stream issues
        }
    });
}


exports.register = function () {
    const plugin = this;

    if (!process.env.MONGO_URI || !process.env.REDIS_URL) {
        plugin.logcrit("queue_to_bull: MONGO_URI or REDIS_URL is not defined. Plugin will be disabled.");
        return;
    }

    // register the outbound hook
    this.register_hook('queue_outbound', 'intercept_for_worker');

    // async init without blocking Haraka startup; set ready flag when done
    (async () => {
        try {
            plugin.loginfo('queue_to_bull: connecting to MongoDB...');
            mongoClient = new MongoClient(process.env.MONGO_URI);
            await mongoClient.connect(); // await to ensure conn established. See mongo docs.
            plugin.loginfo('queue_to_bull: MongoDB connected.');

            mailQueue = new Queue('mail-delivery-queue', {
                connection: { url: process.env.REDIS_URL }
            });
            // ensure queue/redis is ready before we accept jobs
            if (typeof mailQueue.isReady === 'function') {
                await mailQueue.isReady();
            }
            plugin.loginfo("queue_to_bull: BullMQ queue initialized and ready.");

            ready = true;
        } catch (err) {
            plugin.logerror(`queue_to_bull: initialization error: ${err.stack || err}`);
            mongoClient = null;
            mailQueue = null;
            ready = false;
        }
    })();
};


exports.intercept_for_worker = async function (next, connection) {
    const plugin = this;
    const transaction = connection.transaction;

    if (!mongoClient || !mailQueue) {
        plugin.logerror("queue_to_bull: Mongo/Redis not ready. Deferring mail.");
        return next(DENYSOFT, "Server temporarily unavailable.");
    }

    if (WORKER_IPS.includes(connection.remote.ip)) {
        plugin.loginfo(`Bypassing interception from worker IP ${connection.remote.ip}`);
        return next();
    }

    if (!connection.relaying) return next();

    try {
        const db = mongoClient.db("ditmail");
        const usersCollection = db.collection("users");
        const messagesCollection = db.collection("messages");

        const authUserEmail = connection.get("auth_user");
        if (!authUserEmail) {
            plugin.logerror("queue_to_bull: No authenticated user on connection.");
            return next(DENY, "Authentication required.");
        }

        const user = await usersCollection.findOne({ email: authUserEmail.toLowerCase() });
        if (!user) {
            plugin.logerror(`queue_to_bull: Authenticated user ${authUserEmail} not found in DB.`);
            return next(DENY, "Authenticated user does not exist.");
        }

        // ✅ Directly get full message body (no streaming)
        const rawEmail = transaction.message_stream.get_data();
        if (!rawEmail) {
            plugin.logerror("queue_to_bull: Could not retrieve email body from transaction.message_stream.");
            return next(DENYSOFT, "Server error: Failed to process email body.");
        }

        const parsed = await simpleParser(rawEmail);

        const message = {
            from: user.email,
            to: parsed.to?.value.map(addr => addr.address) || [],
            cc: parsed.cc ? parsed.cc.value.map(addr => addr.address) : [],
            bcc: parsed.bcc ? parsed.bcc.value.map(addr => addr.address) : [],
            subject: parsed.subject || "",
            html: parsed.html || parsed.textAsHtml || "",
            text: parsed.text || "",
            status: "queued",
            folder: "sent",
            direction: "outbound",
            org_id: user.org_id,
            user_id: user._id,
            thread_id: `${Date.now()}_${user._id}`,
            sent_at: new Date(),
        };

        const result = await messagesCollection.insertOne(message);
        const messageId = result.insertedId;

        await mailQueue.add("send-email-job", { messageId: messageId.toString() });

        plugin.loginfo(`queue_to_bull: Queued message ${messageId} for ${user.email}`);
        return next(OK, "Message accepted and queued.");

    } catch (err) {
        plugin.logerror(`queue_to_bull: error: ${err.stack || err}`);
        return next(DENYSOFT, "Server error: Failed to process email body.");
    }
};

exports.shutdown = async function () {
    const plugin = this;
    plugin.loginfo('queue_to_bull: shutting down plugin, closing resources...');
    try {
        if (mailQueue) {
            await mailQueue.close();
            plugin.loginfo('queue_to_bull: mailQueue closed.');
        }
    } catch (e) {
        plugin.logerror('queue_to_bull: error closing mailQueue: ' + (e.stack || e));
    }
    try {
        if (mongoClient) {
            await mongoClient.close();
            plugin.loginfo('queue_to_bull: mongoClient closed.');
        }
    } catch (e) {
        plugin.logerror('queue_to_bull: error closing mongo: ' + (e.stack || e));
    }
};
