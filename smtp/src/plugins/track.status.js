const mongodb = require('mongodb');

exports.register = function () {
  this.register_hook('delivered', 'update_status');
  this.register_hook('bounce', 'update_status');
  this.register_hook('deferred', 'update_status');
};

exports.update_status = async function (next, hmail, params) {
  const plugin = this;

  if (!plugin.dbClient) {
    plugin.logerror('MongoDB client not initialized in worker. Skipping update.');
    return next();
  }

  // --- NEW LOGIC: FIND THE MESSAGE ID ---
  // The hmail object contains the headers of the email being delivered.
  const internalIdHeader = hmail.header.get('x-internal-message-id');

  if (!internalIdHeader) {
    // This email might be a bounce notification or system mail without our ID.
    // It's safe to ignore it.
    plugin.logdebug("No 'X-Internal-Message-ID' header found. Skipping status update.");
    return next();
  }

  // Sanitize the ID (headers can sometimes have extra characters)
  const messageId = internalIdHeader.trim();

  const db = plugin.dbClient.db('ditmail');
  const messages = db.collection('messages');

  const now = new Date();
  let update = {};
  const hook = this.hook;

  if (hook === 'delivered') {
    update = {
      $set: {
        status: 'delivered',
        delivered_at: now,
        // The last_smtp_response is useful for debugging.
        last_smtp_response: params[2] || 'OK', 
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
    let bounceError = 'Bounced';
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
    const delay = (params && params.delay) ? params.delay : 60;
    const err_msg = (params && params.err && params.err.message) ? params.err.message : 'Temporary failure';
    update = {
      $set: {
        status: 'deferred',
        deferred_at: now,
        error: err_msg,
        retry_in: delay
      }
    };
  } else {
    return next(); // Should not happen, but safe to have.
  }

    try {
    // ** FIX: Query using the MongoDB _id from the header **
    const result = await messages.updateOne(
      { _id: new ObjectId(messageId) }, 
      update
    );
    
    if (result.matchedCount > 0) {
        plugin.loginfo(`Updated status for message ${messageId} → ${hook}`);
    } else {
        plugin.logwarn(`Could not find message with _id ${messageId} to update.`);
    }
  } catch (err) {
    plugin.logerror(`Failed to update message status for ${messageId}: ${err}`);
  }

  next();
};

exports.init_mongo = async function () {
  const plugin = this;
  const MongoClient = mongodb.MongoClient;
  const uri = process.env.MONGO_URI;

  if (plugin.dbClient) return; // Already connected

  if (!uri) {
      plugin.logerror("MONGO_URI environment variable not set.");
      return;
  }

  try {
    plugin.dbClient = await MongoClient.connect(uri, {
      useUnifiedTopology: true,
    });
    plugin.loginfo('MongoDB connected for track_status worker.');
  } catch (err) {
    plugin.logerror(`MongoDB init failed for worker: ${err.message}`);
  }
};

// Use hook_init_child to run init_mongo in each worker
exports.hook_init_child = function (next) {
  this.init_mongo().then(() => next());
};

// Add a shutdown hook to cleanly close the connection when a worker exits
exports.hook_shutdown = function() {
    if (this.dbClient) {
        this.loginfo('Closing MongoDB connection for track_status worker.');
        this.dbClient.close();
    }
};