// File: /DITMail/src/plugins/rcpt_to.mongodb.js

const { MongoClient } = require('mongodb');
let db;
let mongoClient;

exports.register = function () {
    const plugin = this;

    plugin.loginfo("Initializing rcpt_to.mongodb plugin...");

    plugin.loginfo('with' + process.env.MONGO_URI + env.MONGO_URI)

    const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const dbName = 'ditmail';


    // Connect to MongoDB. Note the architectural flaw below.
    if (!mongoClient) {
        mongoClient = new MongoClient(mongoUrl);
        mongoClient.connect()
            .then(() => {
                db = mongoClient.db(dbName);
                plugin.loginfo('Successfully connected to MongoDB for custom domains.');
            })
            .catch(err => {
                plugin.logcrit(`FATAL: Could not connect to MongoDB. Plugin will not work. Error: ${err}`);
            });
    }


    plugin.register_hook('rcpt', 'check_rcpt_to');
};

exports.check_rcpt_to = async function (next, connection, params) {
    const plugin = this;
    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();

    // Always check if the database connection is available
    if (!db) {
        plugin.logerror(`Database not ready, deferring mail for ${rcpt.address}`);
        return next(DENYSOFT, "Recipient verification is temporarily unavailable.");
    }

    try {
        plugin.logdebug(`Checking domain: ${domain}`);

        // Query the 'domains' collection for an active/verified domain
        const domainDoc = await db.collection('domains').findOne({ domain: domain, status: "verified" });

        if (domainDoc) {
            // THE FIX IS HERE: Use next(OK) to accept the recipient.
            plugin.loginfo(`Domain ${domain} is valid, accepting recipient: ${rcpt.address}`);
            return next(OK);
        } else {
            // Domain not found or not verified. Reject it permanently.
            plugin.logwarn(`Domain ${domain} not found or not verified, rejecting recipient: ${rcpt.address}`);
            return next(DENY, "The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos or unnecessary spaces. For more information, go to https://pro.freecustom.email/support?code=No_Such_User.");
        }
    } catch (err) {
        plugin.logerror("Database error during recipient validation: " + err.message);
        return next(DENYSOFT, "A temporary error occurred during recipient validation.");
    }
};