// File: /DITMail/src/plugins/rcpt_to.mongodb.js

'use strict';
const { MongoClient } = require('mongodb');

// These will be initialized once when the plugin loads
let client;
let db;

exports.register = function () {
    const plugin = this;
    plugin.loginfo("Initializing custom rcpt_to.mongodb plugin...");

    // Load configuration from rcpt_to.mongodb.ini
    plugin.load_rcpt_to_mongodb_ini();

    // Check if the URI is configured
    if (!plugin.cfg.main.uri) {
        plugin.logcrit("MongoDB URI is not configured in rcpt_to.mongodb.ini. The plugin will not work.");
        return;
    }

    // Initialize the MongoDB client.
    // The driver manages a connection pool, so we only need one client instance.
    // We will connect on-demand inside the hook.
    client = new MongoClient(plugin.cfg.main.uri, {
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000 // Timeout if the server isn't available
    });

    // Register the hook that will run for every RCPT TO command
    plugin.register_hook('rcpt', 'check_rcpt_to');
};

exports.check_rcpt_to = async function (next, connection, params) {
    const plugin = this;
    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();

    // If the client wasn't initialized (due to missing config), deny softly.
    if (!client) {
        return next(DENYSOFT, "Recipient verification is temporarily unavailable (misconfiguration).");
    }

    try {
        // This ensures we are connected. The driver reuses connections from its pool.
        await client.connect();
        db = client.db(); // Get the default database from the connection string

        plugin.logdebug(`Checking domain: ${domain}`);

        // Query the 'domains' collection for an active/verified domain
        const domainDoc = await db.collection('domains').findOne({
            domain: domain,
            status: "verified"
        });

        if (domainDoc) {
            // Domain is valid, accept the recipient.
            plugin.loginfo(`Domain ${domain} is valid, accepting recipient: ${rcpt.address}`);
            return next(OK);
        } else {
            // Domain not found or not verified. Reject it permanently.
            plugin.logwarn(`Domain ${domain} not found or not verified, rejecting recipient: ${rcpt.address}`);
            return next(DENY, "The email account that you tried to reach does not exist.");
        }
    } catch (err) {
        // This will catch connection errors or query errors.
        plugin.logerror("Database error during recipient validation: " + err.message);
        return next(DENYSOFT, "A temporary error occurred during recipient validation.");
    }
};

// This function is called when Haraka is shutting down
exports.shutdown = function () {
    this.loginfo("Shutting down rcpt_to.mongodb, closing DB connection.");
    if (client) {
        client.close();
    }
};