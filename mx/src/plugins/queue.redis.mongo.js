const shortid = require('shortid');
const { simpleParser } = require('mailparser');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

let db, gfsBucket;
MongoClient.connect('mongodb://localhost:27017/ditmail', {
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
  plugin.cfg = plugin.config.get('queue.redis.ini', () => {
    plugin.load_ini();
  });
};

function classify(parsed) {
  const subj = parsed.subject?.toLowerCase() || '';
  if (subj.includes("win") || subj.includes("free") || subj.includes("offer") || subj.includes("viagra")) {
    return 'spam';
  }
  return 'inbox';
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

      const folder = classify(parsed);
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
          folder,
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