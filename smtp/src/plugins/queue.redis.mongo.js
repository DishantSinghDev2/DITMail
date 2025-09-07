const shortid = require('shortid');
const format = require('date-fns').format;
const simpleParser = require('mailparser').simpleParser;
const { MongoClient } = require('mongodb');

let mongoClient;

exports.register = function () {
  const plugin = this;
  plugin.load_ini();
  plugin.register_hook('queue', 'save_to_redis_and_mongo');
};

exports.load_ini = function () {
  const plugin = this;
  plugin.cfg = plugin.config.get('queue.redis.ini', () => {
    plugin.load_ini();
  });

  const mongoURL = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = 'ditmail';

  mongoClient = new MongoClient(mongoURL, { useUnifiedTopology: true });
  mongoClient.connect().catch(console.error);
  plugin.mongoDB = mongoClient.db(dbName);
};

exports.save_to_redis_and_mongo = function (next, connection) {
  const plugin = this;
  const redis = connection.server.notes.redis;
  const stream = connection.transaction.message_stream;
  const recipients = connection.transaction.rcpt_to;

  const mailbox_size = ((plugin.cfg.main || {}).mailbox_size || 10) - 1;
  const mailbox_ttl = ((plugin.cfg.main || {}).mailbox_ttl || 3600);

  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));
  stream.on("end", () => {
    const body = Buffer.concat(chunks).toString();

    simpleParser(body, async (err, parsed) => {
      if (err) return next(DENY, "Parse error");

      for (const recipient of recipients) {
        const destination = recipient.user.toLowerCase();
        const key = `mailbox:${destination}`;
        const id = shortid.generate();

        const metadata = {
          id,
          from: parsed.from.text,
          to: destination,
          subject: parsed.subject,
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
          direction: 'inbound',
          size: Buffer.byteLength(body),
          status: 'received',
          error: null,
          smtp_response: null,
          attempts: 0,
          processedAt: new Date(),
        };

        const messageBody = {
          ...metadata,
          body: body,
          html: parsed.html || parsed.textAsHtml || null
        };
        redis.lPush(key, JSON.stringify(metadata));
        redis.lPush(key + ":body", JSON.stringify(messageBody));
        redis.lTrim(key, 0, mailbox_size);
        redis.lTrim(key + ":body", 0, mailbox_size);
        redis.expire(key, mailbox_ttl);
        redis.expire(key + ":body", mailbox_ttl);

        redis.publish(`mailbox:events:${destination}`, JSON.stringify({
          type: 'new_mail',
          mailbox: destination,
          messageId: id,
          subject: metadata.subject,
          from: metadata.from,
          date: metadata.date
        }));

        // Save to MongoDB
        await plugin.mongoDB.collection('emails').insertOne(messageBody);
      }

      next(OK);
    });
  });

  stream.resume();
};
