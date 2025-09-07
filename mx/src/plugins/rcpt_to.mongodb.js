// File: /DITMail/src/plugins/rcpt_to.mongodb.js

const { MongoClient } = require('mongodb');
let db;
let mongoClient;

exports.register = function () {
    const plugin = this;

    plugin.loginfo("Initializing rcpt_to.mongodb plugin...");

    const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const dbName = 'ditmail';

    // Connect to MongoDB once at startup
    if (!mongoClient) {
        mongoClient = new MongoClient(mongoUrl);
        mongoClient.connect()
            .then(() => {
                db = mongoClient.db(dbName);
                plugin.loginfo('Successfully connected to MongoDB for recipient validation.');
            })
            .catch(err => {
                plugin.logcrit(`FATAL: Could not connect to MongoDB. Error: ${err}`);
            });
    }

    plugin.register_hook('rcpt', 'check_rcpt_to');
};

exports.check_rcpt_to = async function (next, connection, params) {
    const plugin = this;
    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();
    const email = rcpt.address().toLowerCase();

    if (!db) {
        plugin.logerror(`Database not ready, deferring mail for ${email}`);
        return next(DENYSOFT, "Recipient verification is temporarily unavailable.");
    }

    try {
        // --- 1. Check domain in "domains" collection ---
        plugin.logdebug(`Checking domain: ${domain}`);

        if (domain !== 'ditmail.online') {
            const domainDoc = await db.collection('domains').findOne({
                domain: domain,
                status: "verified"
            });

            if (!domainDoc) {
                plugin.logwarn(`Domain ${domain} not verified, rejecting recipient: ${email}`);
                return next(DENY, "The domain does not exist or is not verified.");
            }
        }


        // --- 2. Check user in "users" collection ---
        plugin.logdebug(`Checking user: ${email}`);

        const userDoc = await db.collection('users').findOne({
            email: email
        });

        if (!userDoc) {
            plugin.logwarn(`User ${email} does not exist, rejecting.`);
            return next(DENY, "No such user exists. Please check the email address for typos. Learn more here: https://mail.dishis.tech/support?code=no-such-user");
        }

        // ✅ Both checks passed
        plugin.loginfo(`Recipient ${email} accepted (domain + user verified).`);
        return next(OK);

    } catch (err) {
        plugin.logerror("Database error during recipient validation: " + err.message);
        return next(DENYSOFT, "A temporary error occurred during recipient validation.");
    }
};
