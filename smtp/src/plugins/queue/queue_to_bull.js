// plugins/queue/queue_to_bull.js
const { Queue } = require('bullmq');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const { simpleParser, MailParser } = require('mailparser');
const { Readable } = require('stream');
const fs = require('fs');
const os = require('os');
const path = require('path');

let mongoClient = null;
let mailQueue = null;
let ready = false;

const WORKER_IPS = ['127.0.0.1', '::1', '172.19.0.1'];

function getRawEmail(transaction) {
    return new Promise((resolve, reject) => {
        transaction.message_stream.get_data((data) => {
            resolve(data);
        });
    });
}

exports.register = function () {
    const plugin = this;

    if (!process.env.MONGO_URI || !process.env.REDIS_URL) {
        plugin.logcrit("queue_to_bull: MONGO_URI or REDIS_URL is not defined. Plugin will be disabled.");
        return;
    }

    this.register_hook('queue_outbound', 'intercept_for_worker');
    (async () => {
        try {
            plugin.loginfo('queue_to_bull: connecting to MongoDB...');
            mongoClient = new MongoClient(process.env.MONGO_URI);
            await mongoClient.connect();
            plugin.loginfo('queue_to_bull: MongoDB connected.');

            mailQueue = new Queue('mail-delivery-queue', {
                connection: { url: process.env.REDIS_URL }
            });
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
    const redis = connection.server.notes.redis;

    if (!mongoClient || !mailQueue) {
        plugin.logerror("queue_to_bull: Mongo/Redis not ready. Deferring mail.");
        return next(DENYSOFT, "Server temporarily unavailable.");
    }

    if (WORKER_IPS.includes(connection.remote.ip)) {
        const jobData = {
            headers: connection.transaction.header_lines,
        };
        plugin.loginfo(`jobData: ${JSON.stringify(jobData)}`)


        transaction.notes.x_internal_message_id = 'hi';

        plugin.loginfo(`Bypassing interception from worker IP ${connection.remote.ip} `);
        return next();
    }

    if (!connection.relaying) return next();

    try {
        const db = mongoClient.db("ditmail");
        const usersCollection = db.collection("users");
        const messagesCollection = db.collection("messages");
        const attachmentBucket = new GridFSBucket(db, { bucketName: 'attachments' });


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

        const rawEmail = await getRawEmail(transaction);
        if (!rawEmail) {
            plugin.logerror("queue_to_bull: Could not retrieve email body from transaction.message_stream.");
            return next(DENYSOFT, "Server error: Failed to process email body.");
        }

        const parsed = await simpleParser(rawEmail);
        const now = new Date();

        const attachmentIds = [];
        if (parsed.attachments && parsed.attachments.length > 0) {
            for (const att of parsed.attachments) {
                if (att.content && att.content.length > 0) {
                    const gridfsId = await new Promise((resolve, reject) => {
                        const readableStream = Readable.from(att.content);
                        const uploadStream = attachmentBucket.openUploadStream(att.filename, {
                            contentType: att.contentType,
                        });

                        uploadStream.on('finish', () => {
                            resolve(uploadStream.id);
                        });

                        uploadStream.on('error', (err) => {
                            reject(err);
                        });

                        readableStream.pipe(uploadStream);
                    });

                    attachmentIds.push(gridfsId);
                }
            }
        }

        const message = {
            _id: new ObjectId(),
            message_id: parsed.messageId || new ObjectId().toString(),
            references: parsed.references || [],
            from: parsed.from?.value[0]?.address || user.email,
            to: parsed.to ? parsed.to.value.map(addr => addr.address) : [],
            cc: parsed.cc ? parsed.cc.value.map(addr => addr.address) : [],
            bcc: parsed.bcc ? parsed.bcc.value.map(addr => addr.address) : [],
            subject: parsed.subject || "",
            html: parsed.html || parsed.textAsHtml || "<html><body><p>This email is best viewed in an HTML-compatible email client.</p></body></html>",
            text: parsed.text || "This email requires an HTML-compatible email client.",
            attachments: parsed.attachments?.map(a => ({
                filename: a.filename,
                contentType: a.contentType,
                size: a.size,
                cid: a.cid,
            })) || [],
            attachment_gridfs_ids: attachmentIds,
            size: rawEmail.length,
            headers: Object.fromEntries(parsed.headers.entries()),
            status: "queued",
            folder: "sent",
            org_id: user.org_id,
            user_id: user._id,
            read: true,
            starred: false,
            important: false,
            direction: "outbound",
            thread_id: `${Date.now()}_${user._id}`,
            labels: [],
            size: rawEmail.length,
            spam_score: 0,
            encryption_status: "none",
            sent_at: now,
            created_at: now,
            search_text: `${parsed.subject || ""} ${parsed.from?.text || ""} ${parsed.to?.text || ""}`,
        };


        const result = await messagesCollection.insertOne(message);
        const messageId = result.insertedId;

        await mailQueue.add("send-email-job", { messageId: messageId.toString() });

        plugin.loginfo(`queue_to_bull: Queued message ${messageId} for ${user.email}`);

        try {
            const pattern = `cache:msg:${user.id}:*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
            }
        } catch (error) {
            plugin.logerror('Redis cache invalidation error')
        }
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
