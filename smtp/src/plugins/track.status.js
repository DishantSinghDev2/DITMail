const { MongoClient, ObjectId } = require('mongodb'); // Include ObjectId

exports.register = function () {
  this.register_hook('delivered', 'update_status');
  this.register_hook('bounce', 'update_status');
  this.register_hook('deferred', 'update_status');
};

exports.update_status = async function (next, hmail, params) {
  const plugin = this;

  if (!plugin.dbClient) {
    plugin.logerror('MongoDB client not initialized. Skipping update.');
    return next();
  }

  if (!hmail?.todo?.headers) {
    plugin.logdebug("Email object missing headers. Skipping status update.");
    return next();
  }

  const messageId = hmail.todo.headers['x-internal-message-id'];
  if (!messageId) {
    plugin.logdebug("No X-Internal-Message-ID header. Skipping update.");
    return next();
  }

  const db = plugin.dbClient.db('ditmail');
  const messages = db.collection('messages');
  const now = new Date();

  let update = {};
  const hook = this.hook;

  if (hook === 'delivered') {
    const [host, ip, response, delay, port, mode, ok_recips, secured] = params;
    update = {
      $set: {
        status: 'delivered',
        delivered_at: now,
        last_smtp_response: response,
        delivery_info: { host, ip, response, delay, port, mode, ok_recips, secured }
      }
    };
  } else if (hook === 'bounce') {
    let bounceError = 'Bounced';
    if (params && params[0] instanceof Error) bounceError = params[0].message;
    else if (typeof params === 'string') bounceError = params;

    update = {
      $set: {
        status: 'bounced',
        bounced_at: now,
        error: bounceError,
        error_details: params
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

exports.hook_init_child = function (next) {
  this.init_mongo().then(() => next());
};

exports.hook_shutdown = function (next) {
  if (this.dbClient) {
    this.loginfo('Closing MongoDB connection in worker.');
    this.dbClient.close();
  }
  return next?.();
};
