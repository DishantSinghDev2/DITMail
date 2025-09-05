// /home/dit/DITMail/smtp/src/plugins/track.status.js
const { MongoClient, ObjectId } = require('mongodb'); // Include ObjectId

exports.register = function () {
  this.register_hook('delivered', 'update_status');
  this.register_hook('bounce', 'update_status');
  this.register_hook('deferred', 'update_status');
};

exports.update_status = async function (next, hmail, params) {
  const plugin = this;
  if (!plugin.dbClient || !plugin.redisClient) {
    plugin.logerror('MongoDB or Redis client not initialized. Skipping update.');
    return next();
  }

  const messageId = hmail?.todo?.headers['x-internal-message-id'];
  if (!messageId) {
    plugin.logdebug("No X-Internal-Message-ID header. Skipping update.");
    return next();
  }

  const db = plugin.dbClient.db('ditmail');
  const messages = db.collection('messages');
  const deliveryFailures = db.collection('deliveryfailures');
  const now = new Date();
  const hook = this.hook;

  if (hook === 'bounce') {
    let bounceError = 'Bounced';
    if (params && params[0] instanceof Error) bounceError = params[0].message;
    else if (Array.isArray(params)) bounceError = params.join(' ');

    const statusCodeMatch = bounceError.match(/^(\d{3})/);
    const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 500;

    const update = {
      $set: {
        status: 'failed',
        delivery_status: 'bounced',
        bounced_at: now,
        error: bounceError
      }
    };

    try {
      const originalMessage = await messages.findOne({ _id: new ObjectId(messageId) });
      if (originalMessage) {
        const senderId = originalMessage.user_id.toString();
        const recipients = hmail.rcpt_to.map(r => r.address());

        for (const recipient of recipients) {
          await deliveryFailures.insertOne({
            original_message_id: originalMessage._id,
            user_id: originalMessage.user_id,
            org_id: originalMessage.org_id,
            failed_recipient: recipient,
            status_code: statusCode,
            diagnostic_code: bounceError,
            reason: `Delivery to ${recipient} failed.`,
            is_hard_bounce: statusCode >= 500,
            created_at: now
          });

          const notificationPayload = JSON.stringify({
            type: 'delivery_failure', // A new event type
            userId: senderId,
            messageId: originalMessage._id.toString(),
            recipient: recipient,
            reason: bounceError
          });

          const channel = `user-notifications:${senderId}`;
          await plugin.redisClient.publish(channel, notificationPayload);
          plugin.loginfo(`Published delivery failure to Redis channel '${channel}' for message ${messageId}`);
        }
      }
    } catch (err) {
      plugin.logerror(`Error during bounce processing for message ${messageId}: ${err.stack}`);
    }

    // Update the original message status
    await messages.updateOne({ _id: new ObjectId(messageId) }, update);

  } else if (hook === 'delivered') {
    const [host, ip, response, delay, port, mode, ok_recips, secured] = params;
    update = {
      $set: {
        status: 'delivered',
        delivered_at: now,
        last_smtp_response: response,
        delivery_info: { host, ip, response, delay, port, mode, ok_recips, secured }
      }
    };
  } else if (hook === 'deferred') {
    const delayVal = params?.delay ?? 60;
    const errMsg = params?.err?.message ?? 'Temporary failure';

    update = {
      $set: {
        status: 'deferred',
        deferred_at: now,
        error: errMsg,
        retry_in: delayVal
      }
    };
  } else {
    return next();
  }

  try {
    const result = await messages.updateOne(
      { _id: new ObjectId(messageId) },
      update
    );
    if (result.matchedCount > 0) {
      plugin.loginfo(`Updated status for message ${messageId} → ${hook}`);
    } else {
      plugin.logwarn(`Message with _id ${messageId} not found for update.`);
    }
  } catch (err) {
    plugin.logerror(`Failed to update status for ${messageId}: ${err}`);
  }

  return next();
};

exports.init_mongo = async function () {
  const plugin = this;
  if (plugin.dbClient) return;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    plugin.logerror("MONGO_URI not set. Plugin won't work.");
    return;
  }
  try {
    plugin.dbClient = await MongoClient.connect(uri, { useUnifiedTopology: true });
    plugin.loginfo('MongoDB client initialized in worker.');
  } catch (err) {
    plugin.logerror(`MongoDB init failed: ${err.message}`);
  }
};

exports.init_redis = async function() {
    const plugin = this;
    if (plugin.redisClient) return;
    const uri = process.env.REDIS_URL;
    if (!uri) {
        plugin.logerror("REDIS_URL not set. Plugin won't work.");
        return;
    }
    try {
        plugin.redisClient = new Redis(uri);
        plugin.loginfo('Redis client initialized in worker.');
    } catch (err) {
        plugin.logerror(`Redis init failed: ${err.message}`);
    }
}

exports.hook_init_child = function (next) {
  Promise.all([this.init_mongo(), this.init_redis()]).then(() => next());
};

exports.hook_shutdown = function (next) {
  if (this.dbClient) this.dbClient.close();
  if (this.redisClient) this.redisClient.quit(); // <-- Close Redis connection
  return next?.();
};
