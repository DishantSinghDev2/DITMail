const mongodb = require('mongodb');

exports.register = function () {
  this.register_hook('delivered', 'update_status');
  this.register_hook('bounce', 'update_status');
  this.register_hook('deferred', 'update_status');
};

exports.update_status = async function (next, hmail, params) {
  const plugin = this;

  const client = plugin.dbClient;
  if (!client) {
    plugin.logerror('MongoDB client not initialized.');
    return next();
  }

  const db = client.db('ditmail');
  const messages = db.collection('messages');

  const messageId = hmail.todo.uuid || hmail.uuid;
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
    update = {
      $set: {
        status: 'bounced',
        bounced_at: now,
        error: params.message || 'Bounce',
        error_details: params
      }
    };
  } else if (hook === 'deferred') {
    update = {
      $set: {
        status: 'deferred',
        deferred_at: now,
        error: params.err && params.err.message ? params.err.message : 'Temporary failure',
        retry_in: params.delay || 60
      }
    };
  }

  try {
    await messages.updateOne({ id: messageId }, update);
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

  try {
    plugin.dbClient = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    plugin.loginfo('MongoDB connected for track_status');
  } catch (err) {
    plugin.logerror(`MongoDB init failed: ${err.message}`);
  }
};

exports.hook_init_master = function (next) {
  this.init_mongo().then(() => next());
};
