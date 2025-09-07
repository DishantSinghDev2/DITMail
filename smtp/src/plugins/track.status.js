// /home/dit/DITMail/smtp/src/plugins/track.status.js
const Redis = require('ioredis');
const { MongoClient, ObjectId } = require('mongodb');

exports.register = function () {
    this.register_hook('init_child', 'init_connections');
    this.register_hook('delivered', 'delivered');
    this.register_hook('bounce', 'bounce');
    this.register_hook('deferred', 'deferred');
    this.register_hook('shutdown', 'shutdown_connections');
};

exports.init_connections = async function (next) {
    const plugin = this;

    if (!plugin.dbClient) {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            plugin.logerror("MONGO_URI not set. Plugin will not work correctly.");
        } else {
            try {
                plugin.dbClient = new MongoClient(mongoUri, { useUnifiedTopology: true });
                await plugin.dbClient.connect();

                plugin.loginfo("MongoDB client initialized.");
            } catch (err) {
                plugin.logerror(`MongoDB init failed: ${err.stack}`);
            }
        }
    }

    if (!plugin.redisClient) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            plugin.logerror("REDIS_URL not set. Real-time notifications will fail.");
        } else {
            try {
                plugin.redisClient = new Redis(redisUrl);
                plugin.loginfo("Dedicated Redis client initialized.");
            } catch (err) {
                plugin.logerror(`Redis init failed: ${err.stack}`);
            }
        }
    }

    return next();
};

exports.shutdown_connections = function (next) {
    const plugin = this;

    if (plugin.dbClient) {
        plugin.dbClient.close();
        plugin.dbClient = null;
        plugin.loginfo("MongoDB connection closed.");
    }
    if (plugin.redisClient) {
        plugin.redisClient.quit();
        plugin.redisClient = null;
        plugin.loginfo("Redis connection closed.");
    }

    return next && next();
};


['delivered', 'bounce', 'deferred'].forEach(hook => {
    exports[hook] = async function (next, hmail, params) {
        return this.update_status(hook, next, hmail, params);
    };
});

exports.update_status = async function (hook, next, hmail, params) {
    const plugin = this;
    const redis = plugin.redisClient;
    if (!plugin.dbClient || !redis) {
        plugin.logerror("MongoDB or Redis client unavailable. Skipping status update.");
        return next();
    }

    const headers = hmail?.todo?.headers || {};
    plugin.loginfo(`hmail.todo.headers: ${headers} and hmail.todo: ${hmail?.todo}`)
    const messageId = headers['x-internal-message-id'] || null;


    if (!messageId) {
        plugin.logdebug("No X-Internal-Message-ID header found. Skipping status update.");
        return next();
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
            plugin.logwarn(`Original message not found for ID ${messageId}. Skipping.`);
            return next();
        }

        const senderId = originalMessage.user_id.toString();
        const recipients = hmail.rcpt_to.map(r => r.address());

        if (hook === 'bounce') {
            let bounceError = 'Bounced';
            if (params && params[0] instanceof Error) bounceError = params[0].message;
            else if (Array.isArray(params)) bounceError = params.join(' ');

            const statusCodeMatch = bounceError.match(/^(\d{3})/);
            const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 500;

            update = {
                $set: {
                    status: 'failed',
                    delivery_status: 'bounced',
                    bounced_at: now,
                    error: bounceError,
                },
            };

            for (const recipient of recipients) {
                await deliveryFailures.insertOne({
                    original_message_id: objId,
                    user_id: originalMessage.user_id,
                    org_id: originalMessage.org_id,
                    failed_recipient: recipient,
                    status_code: statusCode,
                    diagnostic_code: bounceError,
                    reason: `Delivery to ${recipient} failed.`,
                    is_hard_bounce: statusCode >= 500,
                    created_at: now,
                });

                const notificationPayload = JSON.stringify({
                    type: 'delivery_failure',
                    userId: senderId,
                    messageId,
                    recipient,
                    reason: bounceError,
                });

                const channel = `user-notifications:${senderId}`;
                redis.publish(channel, notificationPayload, (err, res) => {
                    if (err) plugin.logerror(`Redis publish error on ${channel}: ${err.stack}`);
                    else plugin.loginfo(`Published delivery failure to Redis channel "${channel}" for message ${messageId}`);
                });
            }
        }
        else if (hook === 'delivered') {
            const [host, ip, response, delay, port, mode, ok_recips, secured] = params;
            update = {
                $set: {
                    status: 'delivered',
                    delivered_at: now,
                    last_smtp_response: response,
                    delivery_info: { host, ip, response, delay, port, mode, ok_recips, secured },
                },
            };
        }
        else if (hook === 'deferred') {
            const errMsg = params?.err?.message || 'Temporary failure';
            const delayVal = params?.delay || 60;
            update = {
                $set: {
                    status: 'deferred',
                    deferred_at: now,
                    error: errMsg,
                    retry_in: delayVal,
                },
            };
        }

        const result = await messages.updateOne({ _id: objId }, update);
        if (result.matchedCount > 0) {
            plugin.loginfo(`Updated status for message ${messageId} → ${hook}`);
        } else {
            plugin.logwarn(`Message _id ${messageId} not found when updating status.`);
        }
    } catch (err) {
        plugin.logerror(`Error in update_status (${hook}) for message ${messageId}: ${err.stack}`);
    }

    return next();
};
