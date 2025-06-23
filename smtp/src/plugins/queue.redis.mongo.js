const shortid = require('shortid');
const format = require('date-fns').format;
const simpleParser = require('mailparser').simpleParser;
const { MongoClient, ObjectId } = require('mongodb');
const Grid = require('gridfs-stream');
const fs = require('fs');
const tmp = require('tmp');

let db, gfs;
MongoClient.connect('mongodb://localhost:27017/ditmail', {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(client => {
  db = client.db();
  gfs = Grid(db, require('mongodb'));
}).catch(console.error);

exports.register = function () {
  const plugin = this;
  plugin.load_ini();
  plugin.register_hook('queue', 'save_to_redis_mongo');
};

exports.load_ini = function () {
  const plugin = this;
  plugin.cfg = plugin.config.get('queue.redis.ini', () => {
    plugin.load_ini();
  });
};

function classify(parsed) {
  const subj = parsed.subject?.toLowerCase() || '';
  if (subj.includes("newsletter") || subj.includes("offer")) return 'promotion';
  if (subj.includes("friend") || subj.includes("like")) return 'social';
  if (subj.includes("win") || subj.includes("free")) return 'spam';
  return 'inbox';
}

exports.save_to_redis_mongo = function (next, connection) {
  const plugin = this;
  const redis = connection.server.notes.redis;
  const stream = connection.transaction.message_stream;
  const recipients = connection.transaction.rcpt_to;
  const txn = connection.transaction;

  plugin.cfg = plugin.config.get('queue.redis.ini');
  const mailbox_size = ((plugin.cfg.main || {}).mailbox_size || 10) - 1;
  const mailbox_ttl = ((plugin.cfg.main || {}).mailbox_ttl || 3600);

  if (!redis || !db || !gfs) return next(DENYSOFT, "Storage not initialized");

  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));

  stream.on("end", async () => {
    const raw = Buffer.concat(chunks);
    try {
      const parsed = await simpleParser(raw);

      for (const recipient of recipients) {
        const destination = recipient.user.toLowerCase();
        const key = `mailbox:${destination}`;
        const messageId = shortid.generate();

        const tempFile = tmp.fileSync();
        fs.writeFileSync(tempFile.name, raw);
        const uploadStream = gfs.createWriteStream({
          filename: `${messageId}.eml`,
          metadata: {
            user: destination,
            subject: parsed.subject,
            from: parsed.from?.text,
            to: parsed.to?.text,
            date: new Date()
          }
        });

        fs.createReadStream(tempFile.name).pipe(uploadStream);

        uploadStream.on('close', async (file) => {
          const category = classify(parsed);
          const emailMeta = {
            messageId,
            from: parsed.from?.text,
            to: destination,
            subject: parsed.subject || '(no subject)',
            date: new Date(),
            spam: category === 'spam',
            category,
            contentId: file._id,
            attachments: []
          };

          // Store attachments
          if (parsed.attachments?.length) {
            for (const att of parsed.attachments) {
              const attStream = gfs.createWriteStream({
                filename: att.filename,
                metadata: {
                  contentType: att.contentType,
                  size: att.size,
                  user: destination,
                  emailId: messageId
                }
              });
              attStream.end(att.content);
              attStream.on('close', (attFile) => {
                emailMeta.attachments.push({
                  id: attFile._id,
                  filename: attFile.filename,
                  size: attFile.length,
                  contentType: attFile.contentType
                });
              });
            }
          }

          await db.collection('emails').insertOne(emailMeta);

          const lite = {
            id: messageId,
            from: emailMeta.from,
            to: emailMeta.to,
            subject: emailMeta.subject,
            date: emailMeta.date,
            category: emailMeta.category
          };

          redis.lPush(key, JSON.stringify(lite));
          redis.lPush(key + ":body", JSON.stringify({ ...lite, body: parsed.text, html: parsed.html }));
          redis.lTrim(key, 0, mailbox_size);
          redis.lTrim(key + ":body", 0, mailbox_size);
          redis.expire(key, mailbox_ttl);
          redis.expire(key + ":body", mailbox_ttl);

          redis.publish(`mailbox:events:${destination}`, JSON.stringify({
            type: 'new_mail',
            mailbox: destination,
            messageId,
            subject: lite.subject,
            from: lite.from,
            date: lite.date
          }));
        });
      }

      next(OK);
    } catch (err) {
      plugin.logerror("Parse error: " + err);
      next(DENYSOFT, "Parse or DB error");
    }
  });

  stream.resume();
};
