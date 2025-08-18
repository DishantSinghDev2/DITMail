// File: ./mx/src/plugins/rcpt_to.mongodb.js

'use strict';
const { MongoClient } = require('mongodb');

let client;
let db;

exports.register = function () {
    const plugin = this;
    plugin.loginfo("Initializing custom rcpt_to.mongodb plugin...");

    // THE FIX IS HERE: Use the standard config loader.
    // This is more robust and avoids issues with filenames containing dots.
    const config = plugin.config.get('rcpt_to.mongodb.ini');

    // Check if the URI was loaded from the config.
    if (!config || !config.main || !config.main.uri) {
        plugin.logcrit("MongoDB URI is not configured in rcpt_to.mongodb.ini. The plugin will not work.");
        return;
    }

    // Initialize the client using the loaded URI.
    client = new MongoClient(config.main.uri, {
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });

    plugin.register_hook('rcpt', 'check_rcpt_to');
};

exports.check_rcpt_to = async function (next, connection, params) {
    const plugin = this;
    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();

    if (!client) {
        return next(DENYSOFT, "Recipient verification is temporarily unavailable (misconfiguration).");
    }

    try {
        await client.connect();
        db = client.db();

        const domainDoc = await db.collection('domains').findOne({
            domain: domain,
            status: "verified"
        });

        if (domainDoc) {
            plugin.loginfo(`Domain ${domain} is valid, accepting recipient: ${rcpt.address}`);
            return next(OK);
        } else {
            plugin.logwarn(`Domain ${domain} not found or not verified, rejecting recipient: ${rcpt.address}`);
            return next(DENY, "The email account that you tried to reach does not exist.");
        }
    } catch (err) {
        plugin.logerror("Database error during recipient validation: " + err.message);
        return next(DENYSOFT, "A temporary error occurred during recipient validation.");
    }
};

exports.shutdown = function () {
    this.loginfo("Shutting down rcpt_to.mongodb, closing DB connection.");
    if (client) {
        client.close();
    }
};