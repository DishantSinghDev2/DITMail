// plugins/queue_to_bull.js

const { Queue } = require('bullmq');
const { MongoClient, ObjectId } = require('mongodb');
const { simpleParser } = require('mailparser');

let mongoClient;
let mailQueue;

const WORKER_IPS = ['127.0.0.1', '::1'];

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

exports.register = function () {
    const plugin = this;

    // Validate environment variables
    if (!process.env.MONGO_URI || !process.env.REDIS_URL) {
        plugin.logcrit("queue_to_bull: MONGO_URI or REDIS_URL is not defined. Plugin will be disabled.");
        return;
    }

    plugin.register_hook('queue_outbound', 'intercept_for_worker');

    try {
        const mongoURL = process.env.MONGO_URI;
        mongoClient = new MongoClient(mongoURL, { useUnifiedTopology: true });
        mongoClient.connect()
            .then(() => plugin.loginfo('queue_to_bull: MongoDB connection successful.'))
            .catch(err => plugin.logerror(`queue_to_bull: Background MongoDB connection failed: ${err}`));

        // For bullmq v5+, the connection object is expected.
        mailQueue = new Queue('mail-delivery-queue', {
            connection: {
                url: process.env.REDIS_URL
            }
        });
        plugin.loginfo(`queue_to_bull: Initialized BullMQ queue 'mail-delivery-queue'.`);

    } catch (err) {
        plugin.logcrit(`CRITICAL: Failed to initialize clients in queue_to_bull plugin: ${err.message}`);
        mongoClient = null;
        mailQueue = null;
    }
};

exports.intercept_for_worker = async function (next, connection) {
    const plugin = this;
    const transaction = connection.transaction;

    // First, check if the plugin was successfully initialized
    if (!mongoClient || !mailQueue) {
        plugin.logerror("Plugin is disabled due to initialization failure. Deferring mail.");
        return next(DENYSOFT, "Server is temporarily unavailable.");
    }

    // Loop prevention for our own worker
    if (WORKER_IPS.includes(connection.remote.ip)) {
        plugin.loginfo(`Connection from trusted worker IP ${connection.remote.ip}. Bypassing interception.`);
        return next();
    }
    
    if (!connection.relaying) {
        return next();
    }

    plugin.loginfo(`Intercepting outbound mail from ${transaction.mail_from} for worker processing.`);

    try {
        // --- REMOVED THE FAULTY mongoClient.isConnected() CHECK ---
        // The try/catch block is the correct way to handle failures.

        const db = mongoClient.db('ditmail');
        const usersCollection = db.collection('users');
        const messagesCollection = db.collection('messages');
        const authUserEmail = connection.get('auth_user');

        if (!authUserEmail) {
            plugin.logerror("Cannot find authenticated user on the connection. Aborting.");
            return next(DENY, "Authentication credentials not found.");
        }

        const user = await usersCollection.findOne({ email: authUserEmail.toLowerCase() });
        if (!user) {
            plugin.logerror(`Authenticated user ${authUserEmail} not found in database.`);
            return next(DENY, "Authenticated user does not exist.");
        }

        const emailBuffer = await streamToBuffer(transaction.message_stream);
        const parsed = await simpleParser(emailBuffer);

        const message = {
            from: user.email,
            to: parsed.to.value.map(addr => addr.address),
            cc: parsed.cc ? parsed.cc.value.map(addr => addr.address) : [],
            bcc: parsed.bcc ? parsed.bcc.value.map(addr => addr.address) : [],
            subject: parsed.subject,
            html: parsed.html || parsed.textAsHtml || '',
            text: parsed.text || '',
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

        plugin.loginfo(`Successfully queued message ${messageId} for user ${user.email}.`);

        return next(OK, "Message accepted and queued for signing.");

    } catch (err) {
        // THIS is the correct place to catch a database error.
        plugin.logerror(`Error in queue_to_bull plugin: ${err.message}`);
        return next(DENYSOFT, "An internal server error occurred. Please try again later.");
    }
};

exports.shutdown = function () {
    if (mongoClient) mongoClient.close();
    if (mailQueue) mailQueue.close();
};