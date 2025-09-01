const mongodb = require('mongodb');

exports.register = function () {
  this.register_hook('delivered', 'update_status');
  this.register_hook('bounce', 'update_status');
  this.register_hook('deferred', 'update_status');
};

exports.update_status = async function (next, hmail, params) {
  const plugin = this;

  // The client is now guaranteed to be available in the child process
  const client = plugin.dbClient;
  if (!client) {
    // This error should no longer occur, but is good for safety
    plugin.logerror('MongoDB client not initialized in child process.');
    return next();
  }

  const db = client.db('ditmail');
  const messages = db.collection('messages');

  // Use hmail.transaction.uuid for better consistency across hooks
  const messageId = hmail.transaction ? hmail.transaction.uuid : hmail.uuid;
  if (!messageId) {
    plugin.logerror('Missing message UUID');
    return next();
  }

  const now = new Date();
  let update = {};

  const hook = this.hook;

  if (hook === 'delivered') {
    update = {
      $set: {
        status: 'delivered',
        delivered_at: now,
        delivery_info: {
          response: params[2],
          host: params[0],
          ip: params[1],
          port: params[4],
          tls: params[7],
          mode: params[5],
        }
      }
    };
  } else if (hook === 'bounce') {
    let bounceError = 'Bounce';
    // Extract a more descriptive error from bounce params if available
    if (params && params[0] instanceof Error) {
        bounceError = params[0].message;
    } else if (typeof params === 'string') {
        bounceError = params;
    }
    update = {
      $set: {
        status: 'bounced',
        bounced_at: now,
        error: bounceError,
        error_details: params
      }
    };
  } else if (hook === 'deferred') {
    update = {
      $set: {
        status: 'deferred',
        deferred_at: now,
        error: params && params.err ? params.err.message : 'Temporary failure',
        retry_in: params ? params.delay : 60
      }
    };
  }

  try {
    // In MongoDB, the primary key is often _id. Assuming your field is named 'id'.
    await messages.updateOne({ message_id: messageId }, update);
    plugin.loginfo(`Updated status for message ${messageId} → ${hook}`);
  } catch (err) {
    plugin.logerror(`Failed to update message status for ${messageId}: ${err}`);
  }

  next();
};

exports.init_mongo = async function () {
  const plugin = this;
  const MongoClient = mongodb.MongoClient;
  const uri = process.env.MONGO_URI;

  if (plugin.dbClient) {
    // Avoid re-initializing if already connected
    return;
  }

  try {
    // Note: useNewUrlParser is deprecated in recent versions of the driver
    plugin.dbClient = await MongoClient.connect(uri, {
      useUnifiedTopology: true,
    });
    plugin.loginfo('MongoDB connected for track_status');
  } catch (err) {
    plugin.logerror(`MongoDB init failed: ${err.message}`);
  }
};

// ** FIX: Use hook_init_child to initialize the DB connection in each worker process **
exports.hook_init_child = function (next) {
  this.init_mongo().then(() => next());
};
