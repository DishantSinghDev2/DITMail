const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');

let db, users;

exports.register = function () {
    const plugin = this;
    plugin.load_config();
};

exports.load_config = function () {
    const plugin = this;
    const config = plugin.config.get('auth_mongo_user.ini', {
        booleans: ['main.require_tls'],
    });

    plugin.cfg = {
        uri: config.main.uri || 'mongodb://localhost:27017/ditmail',
        collection: config.main.collection || 'users',
        require_tls: config.main.require_tls || false,
    };

    mongodb.MongoClient.connect(plugin.cfg.uri, { useUnifiedTopology: true })
        .then(client => {
            db = client.db();
            users = db.collection(plugin.cfg.collection);
            plugin.loginfo(`Connected to MongoDB for auth, using collection ${plugin.cfg.collection}`);
        })
        .catch(err => {
            plugin.logerror(`Failed to connect to MongoDB: ${err}`);
        });
};

// 👇 This hook ADVERTISES authentication to SMTP clients after STARTTLS
exports.hook_capabilities = function (next, connection) {
    const plugin = this;

    // Advertise AUTH only if TLS is established or TLS not required
    const is_tls = connection && connection.tls;
    if (plugin.cfg.require_tls && !is_tls) {
        return next();
    }

    if (!connection.notes.authenticated) {
        connection.capabilities.push('AUTH LOGIN PLAIN CRAM-MD5');
    }
    return next();
};

// Handles PLAIN authentication
exports.hook_auth_plain = async function (next, connection, params) {
    const plugin = this;

    const username = params[0];
    const password = params[1];

    if (!username || !password) {
        return next(DENY, 'Missing credentials');
    }

    try {
        const user = await users.findOne({ email: username });

        if (!user) {
            return next(DENY, 'Invalid user');
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return next(DENY, 'Invalid password');
        }

        connection.notes.auth_user = {
            id: user._id,
            email: user.email,
            role: user.role,
            org_id: user.org_id,
        };

        connection.loginfo(plugin, `Authenticated: ${user.email}`);
        return next(OK, `Welcome ${user.name || user.email}`);
    } catch (err) {
        plugin.logerror(`Auth error: ${err}`);
        return next(DENYSOFT, 'Temporary error, try again later');
    }
};

// Handles LOGIN authentication (same logic, different format)
exports.hook_auth_login = async function (next, connection, username, password) {
    const plugin = this;
    connection.logdebug(plugin, `AUTH LOGIN received: username=${username}`);
    return exports.hook_auth_plain.call(this, next, connection, [username, password]);
};
