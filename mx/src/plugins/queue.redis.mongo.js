const shortid = require('shortid');
const { simpleParser } = require('mailparser');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

let db, gfsBucket;
MongoClient.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(client => {
  db = client.db();
  gfsBucket = new GridFSBucket(db, { bucketName: 'attachments' });
  console.log('MongoDB and GridFS connected successfully.');
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});

exports.register = function () {
  const plugin = this;
  plugin.load_ini();
  plugin.register_hook('queue', 'save_to_mongo');
};

exports.load_ini = function () {
  const plugin = this;
  // Load the spam scoring configuration from queue.redis.mongo.ini
  plugin.cfg = plugin.config.get('queue.redis.mongo.ini', 'json', () => {
    plugin.load_ini();
  });
};

/**
 * Calculates a spam score based on the results of previously run plugins.
 * @param {object} connection The Haraka connection object.
 * @param {object} transaction The Haraka transaction object.
 * @param {object} parsed The parsed email from mailparser.
 * @param {object} cfg The plugin configuration (from the .ini file).
 * @returns {{score: number, reasons: string[]}} An object containing the final score and an array of reasons.
 */
function calculate_spam_score(connection, transaction, parsed, cfg) {
  let score = 0;
  const reasons = [];
  const spamCfg = cfg.spam || {};

  // Helper to add points and a reason
  const addScore = (points, reason) => {
    if (points && typeof points === 'number') {
      score += points;
      reasons.push(`${reason} (${points})`);
    }
  };

  // 1. SPF results (from 'spf' plugin)
  const spfResult = connection.results.get('spf');
  if (spfResult) {
    switch (spfResult.result) {
      case 'fail': addScore(spamCfg.spf_fail, 'SPF_FAIL'); break;
      case 'softfail': addScore(spamCfg.spf_softfail, 'SPF_SOFTFAIL'); break;
      case 'permerror': addScore(spamCfg.spf_permerror, 'SPF_PERMERROR'); break;
      case 'pass': addScore(spamCfg.spf_pass, 'SPF_PASS'); break;
    }
  }

  // 2. DKIM results (from 'dkim' plugin)
  const dkimResult = transaction.results.get('dkim');
  if (dkimResult) {
    if (dkimResult.result === 'pass') addScore(spamCfg.dkim_pass, 'DKIM_PASS');
    if (dkimResult.result === 'fail') addScore(spamCfg.dkim_fail, 'DKIM_FAIL');
  }

  // 3. Karma results (from 'karma' plugin)
  const karma = connection.results.get('karma');
  if (karma) {
    if (karma.score > 5) addScore(spamCfg.karma_positive, 'KARMA_GOOD');
    if (karma.score < -5) addScore(spamCfg.karma_negative, 'KARMA_BAD');
  }

  // 4. DNS Blacklist results (from 'dns-list' plugin)
  const dnsList = connection.results.get('dns-list');
  if (dnsList?.fail.length > 0) {
    addScore(spamCfg.dns_list_positive, `DNSBL:${dnsList.fail[0]}`);
  }

  // 5. URL Blacklist results (from 'uribl' plugin)
  const uriList = transaction.results.get('uribl');
  if (uriList?.fail.length > 0) {
    addScore(spamCfg.uribl_positive, `URIBL:${uriList.fail[0]}`);
  }

  // 6. ClamAV results (from 'clamd' plugin)
  const clamd = transaction.results.get('clamd');
  if (clamd?.found) {
    addScore(spamCfg.virus_found, `VIRUS:${clamd.found}`);
  }

  // 7. Attachment results (from 'attachment' plugin)
  const attach = transaction.results.get('attachment');
  if (attach?.fail.length > 0) {
    addScore(spamCfg.dangerous_attachment, 'ATTACHMENT_BANNED');
  }

  // 8. FCrDNS results (from 'fcrdns' plugin)
  const fcrdns = connection.results.get('fcrdns');
  if (fcrdns?.result === 'fail') {
    addScore(spamCfg.fcrdns_fail, 'FCRDNS_FAIL');
  }

  // 9. HELO checks (from 'helo.checks' plugin)
  const helo = connection.results.get('helo.checks');
  if (helo?.fail.length > 0) {
    addScore(spamCfg.helo_fail, 'HELO_FAIL');
  }

  // 10. TLS check
  if (!connection.tls.enabled) {
    addScore(spamCfg.tls_disabled, 'TLS_DISABLED');
  }

  // 11. Custom keyword check (your original logic)
  const subj = parsed.subject?.toLowerCase() || '';
  if (subj.includes("win") || subj.includes("free") || subj.includes("offer") || subj.includes("viagra")) {
    addScore(spamCfg.keyword_spam, 'KEYWORD_SPAM');
  }

  return { score: Math.round(score), reasons };
}



exports.save_to_mongo = function (next, connection) {
  const plugin = this;
  const transaction = connection.transaction;

  if (!db || !gfsBucket) {
    plugin.logerror("Storage (MongoDB/GridFS) is not initialized.");
    return next(DENYSOFT, "Backend storage is not available. Please try again later.");
  }

  (async () => {
    const raw = await new Promise((resolve, reject) => {
      const chunks = [];
      transaction.message_stream.on('data', chunk => chunks.push(chunk));
      transaction.message_stream.on('end', () => resolve(Buffer.concat(chunks)));
      transaction.message_stream.on('error', reject);
    });

    const parsed = await simpleParser(raw);
    const spamReport = calculate_spam_score(connection, transaction, parsed, plugin.cfg);
    const spamThreshold = plugin.cfg.spam?.threshold || 15;
    const folder = spamReport.score >= spamThreshold ? 'spam' : 'inbox';

    plugin.loginfo(`Message ${transaction.uuid} from ${parsed.from.value[0].address} scored ${spamReport.score} with reasons: [${spamReport.reasons.join(', ')}]. Destination: ${folder}`);

    const attachmentsSizeInBytes = parsed.attachments?.reduce((sum, att) => sum + (att.size || 0), 0) || 0;
    const totalMessageSizeInBytes = raw.length + attachmentsSizeInBytes;
    const totalMessageSizeInKB = totalMessageSizeInBytes / 1024;

    for (const recipient of transaction.rcpt_to) {
      const destinationEmail = recipient.original.replace(/[<>]/g, '').toLowerCase();

      // 1. Get User, Organization, and Plan details using a multi-stage aggregation
      const userDetailsAggregation = await db.collection('users').aggregate([
        { $match: { email: destinationEmail } },
        // Join with the organizations collection
        {
          $lookup: {
            from: 'organizations',
            localField: 'org_id',
            foreignField: '_id',
            as: 'org_data'
          }
        },
        { $unwind: { path: "$org_data", preserveNullAndEmptyArrays: true } },
        // Join with the plans collection using the organization's plan_id
        {
          $lookup: {
            from: 'plans',
            localField: 'org_data.plan_id',
            foreignField: '_id',
            as: 'plan_data'
          }
        },
        { $unwind: { path: "$plan_data", preserveNullAndEmptyArrays: true } }
      ]).toArray();

      const user = userDetailsAggregation[0];

      if (!user) {
        plugin.logwarn(`Recipient not found, skipping: ${destinationEmail}`);
        continue;
      }

      // 2. Safely get the storage limit in GB and convert to KB
      // Path: user -> plan_data -> limits -> storage
      const storageLimitGB = user?.plan_data?.limits?.storage || 0;
      const storageLimitKB = storageLimitGB * 1024 * 1024; // Convert GB to KB

      // Get current usage (stored in KB)
      const currentStorageKB = user.plan_usage?.storage || 0;

      // 3. Check if user has enough storage space
      if (storageLimitKB > 0 && (currentStorageKB + totalMessageSizeInKB > storageLimitKB)) {
        plugin.logwarn(`User ${destinationEmail} has exceeded their storage limit of ${storageLimitGB} GB. Rejecting message.`);
        return next(DENY, `Recipient's mailbox is full. Your message could not be delivered.`);
      }

      const userId = user._id;
      const orgId = user.org_id;
      const messageMongoId = new ObjectId();
      const attachmentIds = [];

      if (parsed.attachments?.length) {
        const attachmentPromises = parsed.attachments.map(att =>
          new Promise((resolve, reject) => {
            const uploadStream = gfsBucket.openUploadStream(att.filename, {
              contentType: att.contentType,
              metadata: { user_id: userId, message_id: messageMongoId, original_filename: att.filename },
            });
            const gridfsId = uploadStream.id;
            uploadStream.on('finish', () => {
              const attachmentDoc = {
                _id: new ObjectId(),
                filename: att.filename,
                mimeType: att.contentType,
                user_id: userId,
                gridfs_id: gridfsId,
                message_id: messageMongoId,
                size: att.size,
                created_at: new Date(),
              };
              resolve(attachmentDoc);
            });
            uploadStream.on('error', reject);
            uploadStream.end(att.content);
          })
        );
        const attachmentDocs = await Promise.all(attachmentPromises);
        if (attachmentDocs.length > 0) {
          const insertResult = await db.collection('attachments').insertMany(attachmentDocs);
          Object.values(insertResult.insertedIds).forEach(id => attachmentIds.push(id));
        }
      }

      const messageDoc = {
        _id: messageMongoId,
        message_id: parsed.messageId || `<${shortid.generate()}@ditmail.com>`,
        in_reply_to: parsed.inReplyTo,
        references: Array.isArray(parsed.references) ? parsed.references : [parsed.references].filter(Boolean),
        from: parsed.from.value[0].address.toLowerCase(),
        to: parsed.to.value.map(addr => addr.address.toLowerCase()),
        cc: parsed.cc?.value.map(addr => addr.address.toLowerCase()) || [],
        bcc: [],
        subject: parsed.subject || '(no subject)',
        html: parsed.html || '',
        text: parsed.text || '',
        attachments: attachmentIds,
        status: 'received',
        folder, // <-- This is now dynamically set
        spam_score: spamReport.score, // <-- Store the 
        org_id: orgId,
        user_id: userId,
        read: false,
        starred: false,
        important: false,
        thread_id: parsed.inReplyTo || parsed.messageId || messageMongoId.toString(),
        labels: [],
        size: totalMessageSizeInBytes,
        spam_score: folder === 'spam' ? 100 : 0,
        encryption_status: 'none',
        delivery_status: 'delivered',
        created_at: new Date(),
        received_at: new Date(parsed.date) || new Date(),
        headers: Object.fromEntries(parsed.headers.entries()),
        search_text: `${parsed.subject || ''} ${parsed.text || ''}`.trim(),
      };

      // 4. Insert message and update user storage atomically
      await db.collection('messages').insertOne(messageDoc);
      await db.collection('users').updateOne(
        { _id: userId },
        { $inc: { 'plan_usage.storage': totalMessageSizeInKB } }
      );

      plugin.loginfo(`Saved message ${messageMongoId} for ${destinationEmail} and updated storage by ${totalMessageSizeInKB.toFixed(2)} KB.`);

      const redis = connection.server.notes.redis;
      if (redis) {
        const cfg = plugin.config.get('queue.redis.ini');
        const mailbox_size = ((cfg.main || {}).mailbox_size || 10) - 1;
        const mailbox_ttl = ((cfg.main || {}).mailbox_ttl || 3600);

        const userId = user._id.toString(); // We need the string version of the user's ID

        // --- CACHE INVALIDATION ON NEW MAIL ---
        // Flush the user's web app cache so they see this new message on next load
        const pattern = `cache:msg:${userId}:*`;
        try {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(keys);
            plugin.loginfo(`Invalidated ${keys.length} web cache keys for user ${userId}.`);
          }
        } catch (err) {
          plugin.logerror(`Failed to invalidate web cache for user ${userId}: ${err}`);
        }
        // --- END OF CACHE INVALIDATION ---

        const key = `mailbox:${destinationEmail}`;
        const lite = {
          id: messageMongoId.toString(),
          from: messageDoc.from,
          subject: messageDoc.subject,
          date: messageDoc.received_at,
          folder: messageDoc.folder,
          read: false,
          attachments: attachmentIds.length > 0,
        };
        redis.lPush(key, JSON.stringify(lite));
        redis.lTrim(key, 0, mailbox_size);
        redis.expire(key, mailbox_ttl);
        redis.publish(`mailbox:events:${destinationEmail}`, JSON.stringify({
          type: 'new_mail',
          message: lite,
        }));
      }
    }

    next(OK);

  })().catch(err => {
    plugin.logerror("Error processing email: " + (err.stack || err));
    next(DENYSOFT, "An internal error occurred while processing the message.");
  });

  transaction.message_stream.resume();
};