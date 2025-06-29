const mongodb = require('mongodb');
let db;

exports.register = function () {
    const plugin = this;

    // Connect to MongoDB once when Haraka starts
    mongodb.MongoClient.connect('mongodb://localhost:27017/ditmail', { useUnifiedTopology: true })
        .then(client => {
            db = client.db();
            plugin.loginfo("Connected to MongoDB for domain validation");
        })
        .catch(err => {
            plugin.logerror("MongoDB connection failed: " + err.message);
        });

    plugin.register_hook('rcpt', 'check_rcpt_to');
};

exports.check_rcpt_to = async function (next, connection, params) {
    if (!db) return next(DENYSOFT, "DB not ready");

    const rcpt = params[0];
    const domain = rcpt.host.toLowerCase();

    try {
        const domainDoc = await db.collection('domains').findOne({ domain: domain, active: true });
        if (domainDoc) {
            return next(); // Accept the recipient
        } else {
            return next(DENY, "Domain not allowed");
        }
    } catch (err) {
        this.logerror("DB error: " + err.message);
        return next(DENYSOFT, "Temporary DB error");
    }
};
