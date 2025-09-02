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

    // ensure plugin is fully ready
    if (!ready || !mongoClient || !mailQueue) {
        plugin.logerror("queue_to_bull: not ready (mongo/redis). Deferring.");
        return next(DENYSOFT, "Server temporarily unavailable.");
    }

    // avoid worker loopback
    if (WORKER_IPS.includes(connection.remote.ip)) {
        plugin.loginfo(`Connection from trusted worker IP ${connection.remote.ip}. Bypassing interception.`);
        return next();
    }

    if (!connection.relaying) return next(); // only intercept relaying/outbound

    plugin.loginfo(`Intercepting outbound mail from ${transaction.mail_from && transaction.mail_from.address()}`);

    try {
        // robustly find authenticated user (depends on your auth plugin)
        const authUserEmail =
            (connection.notes && connection.notes.auth_user) ||
            connection.get('auth_user') || // Most reliable way
            null;

        plugin.loginfo(`passed authUserEmail ${authUserEmail}`)

        if (!authUserEmail) {
            plugin.logerror("queue_to_bull: auth user not found on connection. Debugging object logged.");
            plugin.logdebug(JSON.stringify({
                conn_notes: connection.notes,
                txn_notes: connection.transaction && connection.transaction.notes,
                conn_keys: Object.keys(connection).slice(0, 20)
            }, null, 2));
            return next(DENY, "Authentication credentials not found.");
        }

        const db = mongoClient.db('ditmail');
        const usersCollection = db.collection('users');
        const messagesCollection = db.collection('messages');

        const user = await usersCollection.findOne({ email: authUserEmail.toLowerCase() });
        // --- THIS IS THE CRITICAL LOGGING LINE ---
        // It MUST print the full user object, not '[object Object]'
        plugin.loginfo(`User details from db: ${JSON.stringify(user, null, 2)}`);

        if (!user) {
            plugin.logerror(`Authenticated user ${authUserEmail} not in DB.`);
            return next(DENY, "Authenticated user does not exist.");
        }

        // --- THE FINAL FIX (for real this time) ---
        // Get a new, readable stream for the body using the correct Haraka API.
        const body_stream = transaction.message_stream;

        // Now, use our original streamToBuffer function on this new, correct stream.
        const emailBuffer = await streamToBuffer(body_stream);
        plugin.loginfo(`Successfully buffered email body using get_data_stream().`);
        // --- END OF FIX ---

        const parsed = await simpleParser(emailBuffer);
        plugin.loginfo(`Successfully parsed email body.`);

        let toAddrs = [];
        if (parsed?.to?.value?.length) {
            toAddrs = parsed.to.value.map(a => a.address);
        } else if (transaction.rcpt_to?.length) {
            toAddrs = transaction.rcpt_to.map(r => r.address || r);
        }

        plugin.loginfo(`passed email parsing: ${toAddrs} parsed: ${parsed}`)

        const message = {
            from: user.email,
            to: toAddrs,
            cc: parsed.cc ? parsed.cc.value.map(a => a.address) : [],
            bcc: parsed.bcc ? parsed.bcc.value.map(a => a.address) : [],
            subject: parsed.subject || '',
            html: parsed.html || parsed.textAsHtml || '',
            text: parsed.text || '',
            status: "queued",
            folder: "sent",
            direction: "outbound",
            org_id: user.org_id || null,
            user_id: user._id,
            thread_id: `${Date.now()}_${user._id}`,
            sent_at: new Date(),
            // optionally add metadata/headers or attachments references
        };

        const result = await messagesCollection.insertOne(message);
        const messageId = result.insertedId;

        // ensure queue is ready (defensive)
        if (typeof mailQueue.isReady === 'function') {
            await mailQueue.isReady();
        }

        await mailQueue.add("send-email-job", { messageId: messageId.toString() });

        plugin.loginfo(`Queued message ${messageId} for user ${user.email}.`);
        return next(OK, "Message accepted and queued for signing.");

    } catch (err) {
        plugin.logerror(`queue_to_bull: error: ${err.stack || err}`);
        return next(DENYSOFT, "Internal server error — try again later.");
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
