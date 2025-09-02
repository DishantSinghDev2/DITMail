// plugins/queue_to_bull.js

const { Queue } = require('bullmq');
const { MongoClient, ObjectId } = require('mongodb');
const { simpleParser } = require('mailparser');

let mongoClient;
let mailQueue;

// --- ADD THIS ARRAY AT THE TOP ---
// List of trusted IPs that should bypass this plugin's interception logic.
// This should be the IP(s) of your BullMQ workers.
// '::1' is the IPv6 equivalent of 127.0.0.1.
const WORKER_IPS = ['127.0.0.1', '::1'];

// Helper function to read the stream into a buffer
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

    // --- FIX 1: VALIDATE ENVIRONMENT VARIABLES ---
    if (!process.env.MONGO_URI) {
        plugin.logcrit("MONGO_URI is not defined. The queue_to_bull plugin will be disabled.");
        return; // Stop loading the plugin
    }
    if (!process.env.REDIS_URL) {
        plugin.logcrit("REDIS_URL is not defined. The queue_to_bull plugin will be disabled.");
        return; // Stop loading the plugin
    }

    plugin.register_hook('queue_outbound', 'intercept_for_worker');

    // --- FIX 2: WRAP INITIALIZATIONS IN TRY/CATCH ---
    try {
        const mongoURL = process.env.MONGO_URI;
        const dbName = 'ditmail';
        mongoClient = new MongoClient(mongoURL, { useUnifiedTopology: true });

        mongoClient.connect()
            .then(() => plugin.loginfo('queue_to_bull: MongoDB connection successful.'))
            .catch(err => plugin.logerror(`queue_to_bull: Background MongoDB connection failed: ${err}`));

        const redisConnection = {
            // BullMQ requires the connection options to be inside a 'default' key if passing the whole object
            // Or we can just pass the URL string directly if that's all we have.
            // Let's create an object that bullmq expects, which is more robust
            connection: {
                // This is an example, assuming your REDIS_URL is like "redis://:password@host:port"
                // BullMQ can parse this directly
                url: process.env.REDIS_URL
            }
        };

        // This is a direct connection object for BullMQ v5+, if you are using an older version, the format may vary.
        // For simplicity and common use cases, let's assume BullMQ can handle the URL string.
        mailQueue = new Queue('mail-delivery-queue', { 
            connection: {
                // A simplified and more direct way bullmq handles this.
                // Replace with host/port if your URL is not standard.
                url: process.env.REDIS_URL
            }
        });

        plugin.loginfo(`queue_to_bull: Initialized BullMQ queue 'mail-delivery-queue'.`);

    } catch (err) {
        // This will now catch the crash and log it, preventing the EOF.
        plugin.logcrit(`CRITICAL: Failed to initialize clients in queue_to_bull plugin: ${err.message}`);
        mongoClient = null; // Ensure clients are null on failure
        mailQueue = null;
    }
};

exports.intercept_for_worker = async function (next, connection) {
    const plugin = this;
    const transaction = connection.transaction;

    // +++ ADD THIS CHECK +++
    if (!mongoClient.isConnected()) {
        plugin.logerror("MongoDB is not connected. Deferring mail.");
        // DENYSOFT tells the client to try again later. It's better than a timeout.
        return next(DENYSOFT, "Server is temporarily unavailable, please try again later.");
    }

    // --- LOOP PREVENTION LOGIC ---
    // Check if the connection is from a trusted worker IP.
    if (WORKER_IPS.includes(connection.remote.ip)) {
        plugin.loginfo(`Connection from trusted worker IP ${connection.remote.ip}. Bypassing interception.`);
        // Continue to the next plugin, allowing Haraka's default outbound delivery.
        return next();
    }
    // --- END OF LOOP PREVENTION ---

    if (!connection.relaying) {
        return next();
    }

    plugin.loginfo(`Intercepting outbound mail from ${transaction.mail_from} for worker processing.`);

    try {
        const db = mongoClient.db('ditmail');
        const usersCollection = db.collection('users');
        const messagesCollection = db.collection('messages');

        // --- THE FIX IS HERE ---
        // Use connection.get() to retrieve the username stored by the auth plugin.
        const authUserEmail = connection.get('auth_user');
        // --- END OF FIX ---

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
            // ** ADD THIS LINE **
            haraka_uuid: transaction.uuid, // This creates the link!
            message_id: new ObjectId(),
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
            headers: parsed.headers,
        };

        const result = await messagesCollection.insertOne(message);
        const messageId = result.insertedId;

        await mailQueue.add("send-email-job", { messageId: messageId.toString() });

        plugin.loginfo(`Successfully queued message ${messageId} for user ${user.email}.`);

        return next(OK, "Message accepted and queued for signing.");

    } catch (err) {
        plugin.logerror(`Error in queue_to_bull plugin: ${err.message}`);
        return next(DENY, "An internal error occurred while queuing the message.");
    }
};

exports.shutdown = function () {
    mongoClient.close();
    mailQueue.close();
};