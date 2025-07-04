const shortid = require('shortid');
const { simpleParser } = require('mailparser');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

// Note: gridfs-stream is deprecated. The official MongoDB driver now includes GridFSBucket.
// We will use the modern approach.

let db, gfsBucket;
MongoClient.connect('mongodb://localhost:27017/ditmail', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(client => {
  db = client.db();
  // Initialize GridFSBucket from the official driver
  gfsBucket = new GridFSBucket(db, { bucketName: 'attachments' });
  console.log('MongoDB and GridFS connected successfully.');
}).catch(err => {
    console.error("Failed to connect to MongoDB", err);
    // You might want to exit the process if the DB connection fails
    // process.exit(1);
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

/**
 * Classifies an email based on its subject to determine the destination folder.
 * @param {object} parsed The parsed email object from mailparser.
 * @returns {string} The folder name ('inbox' or 'spam').
 */
function classify(parsed) {
  const subj = parsed.subject?.toLowerCase() || '';
  // Your schema has a 'spam' folder, so we'll classify accordingly.
  // Promotions and social emails will go to the inbox for this example.
  if (subj.includes("win") || subj.includes("free") || subj.includes("offer") || subj.includes("viagra")) {
    return 'spam';
  }
  return 'inbox';
}

exports.save_to_mongo = function (next, connection) {
  const plugin = this;
  const transaction = connection.transaction;

  // Ensure storage is ready
  if (!db || !gfsBucket) {
    plugin.logerror("Storage (MongoDB/GridFS) is not initialized.");
    return next(DENYSOFT, "Backend storage is not available. Please try again later.");
  }
  
  // Use an async IIFE (Immediately Invoked Function Expression) to leverage async/await
  // inside Haraka's callback-based hook system.
  (async () => {
    const raw = await new Promise((resolve, reject) => {
        const chunks = [];
        transaction.message_stream.on('data', chunk => chunks.push(chunk));
        transaction.message_stream.on('end', () => resolve(Buffer.concat(chunks)));
        transaction.message_stream.on('error', reject);
    });

    const parsed = await simpleParser(raw);

    for (const recipient of transaction.rcpt_to) {
        const destinationEmail = recipient.address.toLowerCase();

        // 1. Get User and Organization details from the 'users' collection
        const user = await db.collection('users').findOne({ email: destinationEmail });
        if (!user) {
            plugin.logwarn(`Recipient not found in database, skipping: ${destinationEmail}`);
            continue; // Skip to the next recipient
        }
        const userId = user._id;
        const orgId = user.org_id;

        // 2. Prepare a new ObjectId for the message document.
        // This allows us to link attachments to it before it's inserted.
        const messageMongoId = new ObjectId();
        const attachmentIds = [];
        
        // 3. Process and upload attachments to GridFS, then prepare for the 'attachments' collection
        if (parsed.attachments?.length) {
            const attachmentPromises = parsed.attachments.map(att =>
                new Promise((resolve, reject) => {
                    const uploadStream = gfsBucket.openUploadStream(att.filename, {
                        contentType: att.contentType,
                        metadata: {
                            user_id: userId,
                            message_id: messageMongoId, // Pre-link to the message
                            original_filename: att.filename
                        },
                    });
                    
                    uploadStream.on('finish', (file) => {
                        // Prepare the document for the 'attachments' collection
                        const attachmentDoc = {
                            _id: new ObjectId(), // Generate its own ID
                            filename: att.filename,
                            mimeType: att.contentType,
                            user_id: userId,
                            gridfs_id: file._id, // The ID of the file in GridFS chunks/files
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
              // Collect the newly inserted ObjectId's for the message's 'attachments' array
              Object.values(insertResult.insertedIds).forEach(id => attachmentIds.push(id));
            }
        }
        
        // 4. Construct the document for the 'messages' collection
        const folder = classify(parsed);
        const messageDoc = {
            _id: messageMongoId,
            message_id: parsed.messageId || `<${shortid.generate()}@ditmail.com>`,
            in_reply_to: parsed.inReplyTo,
            references: Array.isArray(parsed.references) ? parsed.references : [parsed.references].filter(Boolean),
            from: parsed.from.value[0].address.toLowerCase(),
            to: parsed.to.value.map(addr => addr.address.toLowerCase()),
            cc: parsed.cc?.value.map(addr => addr.address.toLowerCase()) || [],
            bcc: [], // BCC is stripped by MTAs, not available to the final recipient
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
            thread_id: parsed.inReplyTo || parsed.messageId || messageMongoId.toString(), // Simplified threading
            labels: [],
            size: raw.length,
            spam_score: folder === 'spam' ? 100 : 0,
            encryption_status: 'none',
            delivery_status: 'delivered',
            created_at: new Date(),
            received_at: new Date(parsed.date) || new Date(),
            headers: Object.fromEntries(parsed.headers.entries()), // Convert Map to object for broader compatibility
            search_text: `${parsed.subject || ''} ${parsed.text || ''}`.trim(),
        };

        // 5. Insert the final message document into the database
        await db.collection('messages').insertOne(messageDoc);

        plugin.loginfo(`Saved message ${messageMongoId} for ${destinationEmail}`);
        
        // 6. (Optional) Perform Redis operations for real-time updates or caching
        const redis = connection.server.notes.redis;
        if(redis) {
            const cfg = plugin.config.get('queue.redis.ini');
            const mailbox_size = ((cfg.main || {}).mailbox_size || 10) - 1;
            const mailbox_ttl = ((cfg.main || {}).mailbox_ttl || 3600);
            const key = `mailbox:${destinationEmail}`;

            const lite = {
                id: messageMongoId.toString(), // Use the MongoDB _id
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

  // Resume the stream now, as all data has been buffered.
  transaction.message_stream.resume();
};