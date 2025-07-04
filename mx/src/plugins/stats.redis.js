exports.register = function () {
  const plugin = this;
  plugin.register_hook('queue_ok', 'queued');
  plugin.register_hook('deny', 'denied');
};

exports.queued = function (next, connection) {
  const plugin = this;
  const redis = connection.server.notes.redis;

  if (!!redis) {
    redis.incr("stats:queued", (err, amt) => {
      if (!err) {
        plugin.logwarn(`Queued ${amt} messages`);
        redis.publish("pubsub:queued", amt);
      }
    });
  }
  next();
};

exports.denied = function (next, connection, params) {
  const plugin = this;
  const redis = connection.server.notes.redis;

  // The rejection message is the 2nd param passed to next(DENY, ...);
  const rejectionMessage = params[1] || "Unknown reason";

  // Gracefully handle cases where the transaction hasn't started yet
  const txn = connection.transaction;
  const sender = txn ? txn.mail_from : null;
  const recipients = txn ? txn.rcpt_to : [];

  // Build a more readable sender string for the log
  const senderStr = sender ? sender.original : '(sender not yet provided)';
  
  let output = `Denied message from ${senderStr} @ ${connection.remote.ip}`;
  
  if (recipients.length > 0) {
    output += " to " + recipients.map(r => r.original).join(',');
  }
  
  output += ` : ${rejectionMessage}`;

  plugin.logwarn(output);

  if (redis) {
    redis.incr("stats:denied", (err, amt) => {
      if (err) {
        plugin.logerror(`Redis error incrementing stats:denied: ${err.message}`);
        return;
      }
      plugin.logdebug(`Denied count is now ${amt}`);
      redis.publish("pubsub:denied", amt);
    });
  }
  next();
};