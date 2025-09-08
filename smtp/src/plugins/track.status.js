// /home/dit/DITMail/smtp/src/plugins/track.status.js
const Redis = require('ioredis');
const { MongoClient, ObjectId } = require('mongodb');
const { Queue } = require('bullmq');

exports.register = function () {
    this.register_hook('init_child', 'init_connections');
    this.register_hook('delivered', 'delivered');
    this.register_hook('bounce', 'bounce');
    this.register_hook('deferred', 'deferred');
    this.register_hook('shutdown', 'shutdown_connections');
};

exports.init_connections = async function (next) {
    const plugin = this;
    try {
        if (!plugin.dbClient) {
            const mongoUri = process.env.MONGO_URI;
            if (!mongoUri) throw new Error("MONGO_URI not set.");
            plugin.dbClient = new MongoClient(mongoUri);
            await plugin.dbClient.connect();
            plugin.loginfo("MongoDB client initialized.");
        }
        if (!plugin.redisClient) {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) throw new Error("REDIS_URL not set.");
            plugin.redisClient = new Redis(redisUrl);
            plugin.loginfo("Dedicated Redis client initialized.");
        }
        if (!plugin.mailQueue) {
            plugin.mailQueue = new Queue('mail-delivery-queue', {
                connection: { url: process.env.REDIS_URL }
            });
            plugin.loginfo("BullMQ queue ready in track.status");
        }
    } catch (err) {
        plugin.logerror(`Initialization failed: ${err.stack}`);
    }
    return next();
};

exports.shutdown_connections = function (next) {
    const plugin = this;
    if (plugin.dbClient) plugin.dbClient.close().then(() => plugin.loginfo("MongoDB connection closed."));
    if (plugin.redisClient) plugin.redisClient.quit().then(() => plugin.loginfo("Redis connection closed."));
    if (plugin.mailQueue) plugin.mailQueue.close().then(() => plugin.loginfo("BullMQ connection closed."));
    return next && next();
};

['delivered', 'bounce', 'deferred'].forEach(hook => {
    exports[hook] = async function (next, hmail, params) {
        return this.update_status(hook, next, hmail, params);
    };
});

exports.update_status = async function (hook, next, hmail, params) {
    const plugin = this;
    if (!plugin.dbClient || !plugin.redisClient) {
        plugin.logerror("DB or Redis client unavailable. Skipping status update.");
        return next();
    }

    const messageId = hmail?.todo?.notes?.['x-internal-message-id'];

    if (!messageId) {
        plugin.logwarn("No X-Internal-Message-ID found in transaction notes. Cannot update message status.");
        return next();
    } else{
        plugin.loginfo('Found the internal msg id carrying on, over')
    }

    let objId;
    try {
        objId = new ObjectId(messageId);
    } catch (e) {
        plugin.logerror(`Invalid ObjectId "${messageId}". Skipping update.`);
        return next();
    }

    const db = plugin.dbClient.db('ditmail');
    const messages = db.collection('messages');
    const deliveryFailures = db.collection('deliveryfailures');
    const now = new Date();
    let update = {};

    try {
        const originalMessage = await messages.findOne({ _id: objId });
        if (!originalMessage) {
            plugin.logwarn(`Message not found for ID ${messageId}. Cannot update status.`);
            return next();
        }

        const senderId = originalMessage.user_id.toString();

        if (hook === 'bounce') {
            let bounceError = 'Bounced';
            if (params && params[0]) bounceError = params[0].message ? params[0].message : String(params[0]);
            else if (Array.isArray(params)) bounceError = params.join(' ');

            const statusCodeMatch = bounceError.match(/^(\d{3})/);
            const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 550; // Default to a hard bounce code

            update = { $set: { status: 'failed', delivery_status: 'bounced', bounced_at: now, error: bounceError } };

            for (const recipient of hmail.rcpt_to) {
                const recipientAddress = recipient.address();
                await deliveryFailures.insertOne({
                    original_message_id: objId,
                    user_id: originalMessage.user_id,
                    org_id: originalMessage.org_id,
                    failed_recipient: recipientAddress,
                    status_code: statusCode,
                    diagnostic_code: bounceError,
                    reason: `Delivery to ${recipientAddress} failed.`,
                    is_hard_bounce: statusCode >= 500,
                    created_at: now,
                });

                const subject = `Undeliverable: ${originalMessage.subject || "(no subject)"}`;
                const text = `Your message to ${recipientAddress} was not delivered. The server reported the following error: ${bounceError}`;
                const html = `<div style="font-family:sans-serif;padding:20px;"><h2>Message Not Delivered</h2><p>Your message to <b>${recipientAddress}</b> could not be delivered.</p><p>The remote server responded:</p><blockquote style="border-left:4px solid #ccc;padding-left:15px;color:#555;">${bounceError}</blockquote></div>`;

                const newNdrMsgId = await queueSystemMessage(plugin, originalMessage, recipientAddress, subject, html, text);
                plugin.loginfo(`Queued NDR with new message ID: ${newNdrMsgId} for original message ${objId}`);
                
                const notificationPayload = JSON.stringify({
                    type: 'delivery_failure',
                    userId: senderId,
                    messageId,
                    recipient: recipientAddress,
                    reason: bounceError,
                });
                const channel = `user-notifications:${senderId}`;
                plugin.redisClient.publish(channel, notificationPayload)
                    .catch(err => plugin.logerror(`Redis publish error on ${channel}: ${err.stack}`));
            }
        } else if (hook === 'delivered') {
            const [host, ip, response] = params;
            update = { $set: { status: 'delivered', delivered_at: now, last_smtp_response: response } };
        } else if (hook === 'deferred') {
            const errMsg = params?.err?.message || 'Temporary failure';
            update = { $set: { status: 'deferred', deferred_at: now, error: errMsg } };
        }

        if (Object.keys(update).length > 0) {
            const result = await messages.updateOne({ _id: objId }, update);
            if (result.matchedCount > 0) {
                plugin.loginfo(`Updated status for message ${messageId} to -> ${hook}`);
            }
        }
    } catch (err) {
        plugin.logerror(`Error in update_status (${hook}) for message ${messageId}: ${err.stack}`);
    }

    return next();
};

async function queueSystemMessage(plugin, originalMessage, recipient, subject, html, text) {

    const db = plugin.dbClient.db("ditmail");
    const messagesCollection = db.collection("messages");
    const now = new Date();
    const msgId = new ObjectId();

    const messageDoc = {
        _id: msgId,
        message_id: `<ndr-${msgId}@ditmail.online>`,
        references: [originalMessage.message_id],
        in_reply_to: originalMessage.message_id,
        from: "mailer-daemon@ditmail.online",
        to: [originalMessage.from],
        subject,
        html,
        text,
        attachments: [],
        status: "queued",
        folder: "inbox",
        org_id: originalMessage.org_id,
        user_id: originalMessage.user_id,
        read: false,
        direction: "inbound",
        thread_id: originalMessage.thread_id,
        created_at: now,
        system_generated: true,
    };

    await messagesCollection.insertOne(messageDoc);

    await plugin.mailQueue.add("send-email-job", { messageId: msgId.toString() });

    return msgId;
}