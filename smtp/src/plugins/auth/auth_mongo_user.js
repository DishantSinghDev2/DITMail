// Haraka plugin for authenticating users against a MongoDB database.
//
// This plugin correctly uses Haraka's 'auth_base' framework.
// Passwords in the database must be hashed with bcrypt.

const mongodb = require('mongodb');

// These are module-level variables to hold the database connection.
// They are initialized once in load_mongo_config().
let db, users;

/**
 * Register the plugin with Haraka.
 */
exports.register = function () {
    const plugin = this;

    // VERY IMPORTANT: This tells Haraka to use this plugin within its
    // built-in authentication framework. This is what was missing
    // from your original attempt and what caused the '500' error.
    plugin.inherits('auth/auth_base');

    // Load our custom configuration from auth_mongo.ini
    plugin.load_mongo_config();
    plugin.load_tls_ini();
}

exports.load_tls_ini = function () {
    this.tls_cfg = this.config.get('tls.ini', () => {
        this.load_tls_ini();
    });
}

/**
 * Load configuration from auth_mongo.ini and connect to MongoDB.
 */
exports.load_mongo_config = function () {
    const plugin = this;

    // Load config from haraka/config/auth_mongo.ini
    const config = plugin.config.get('auth_mongo_user.ini', {
        booleans: ['main.require_tls'],
    });

    // Store config for later use
    plugin.cfg = {
        uri: config.main.uri || 'mongodb://localhost:27017/ditmail',
        collection: config.main.collection || 'users',
        // It's highly recommended to require TLS for authentication.
        // Default to true for security.
        require_tls: config.main.require_tls !== false,
    };

    // Establish the MongoDB connection
    mongodb.MongoClient.connect(plugin.cfg.uri, { useUnifiedTopology: true })
        .then(client => {
            db = client.db(); // Use the database specified in the URI
            users = db.collection(plugin.cfg.collection);
            plugin.loginfo(`Connected to MongoDB for auth, using collection "${plugin.cfg.collection}"`);
        })
        .catch(err => {
            // Log a severe error if the connection fails, as auth will not work.
            plugin.logcrit(`Failed to connect to MongoDB: ${err.message}. Authentication will fail.`);
        });
};

/**
 * hook_capabilities is called by Haraka to determine which features (capabilities)
 * to advertise to the SMTP client.
 */
exports.hook_capabilities = (next, connection) => {
    if (connection.tls.enabled) {
        const methods = [ 'PLAIN', 'LOGIN' ];
        connection.capabilities.push(`AUTH ${methods.join(' ')}`);
        connection.notes.allowed_auth_methods = methods;
    }
    next();
}

/**
 * This is the core function required by 'auth_base'. Haraka calls this
 * function after receiving the username and password for both PLAIN and LOGIN auth.
 *
 * @param {object} connection - The connection object.
 * @param {string} username   - The email address provided by the client.
 * @param {string} password   - The password provided by the client.
 * @param {function} cb       - The callback to call with the result. cb(true) for success, cb(false) for failure.
 */
exports.check_plain_passwd = async function (connection, username, password, cb) {
    const plugin = this;

    // 1. Check if the MongoDB connection is established.
    if (!users) {
        plugin.logerror("Authentication check failed: MongoDB connection is not ready.");
        // Provide a user-friendly (but generic) message.
        connection.notes.auth_message = "Server temporarily unavailable, please try again later.";
        return cb(false); // Authentication fails
    }

    try {
        // 2. Find the user in the database by their email.
        const user = await users.findOne({ email: username });

        // 3. If user is not found, fail authentication.
        // We log it, but the client gets a generic failure message to prevent username enumeration.
        if (!user) {
            plugin.logwarn(`AUTH failed for user: ${username} (not found)`);
            return cb(false);
        }

        // 4. Compare the provided password with the stored hash.
        const match = await user.comparePassword(password);

        if (!match) {
            plugin.logwarn(`AUTH failed for user: ${username} (bad password)`);
            return cb(false);
        }

        // 5. Authentication successful!
        plugin.loginfo(connection, `Authenticated user: ${username}`);

        // Set the authenticated user on the connection for Haraka's core and other plugins.
        connection.set('auth_user', username);

        // You can also store the full user object in connection.notes for other plugins to use.
        connection.notes.auth_user_obj = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            org_id: user.org_id
        };

        return cb(true); // Signal success to Haraka

    } catch (err) {
        plugin.logerror(`MongoDB auth error for user ${username}: ${err.message}`);
        connection.notes.auth_message = "An error occurred during authentication.";
        return cb(false);
    }
};