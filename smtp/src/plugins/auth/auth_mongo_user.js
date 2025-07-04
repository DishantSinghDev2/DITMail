// Haraka plugin for authenticating users against a MongoDB database.
//
// This plugin correctly uses Haraka's 'auth_base' framework.
// Passwords in the database must be hashed with bcrypt.

const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');

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

    // Load config from haraka/config/auth_mongo_user.ini
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
            domains = db.collection('domains'); // Assuming you have a domains collection
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
    // This hook is called after the TLS handshake is complete (if any).
    // We only offer AUTH capabilities if the connection is secure.
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
        // Using toLowerCase() to ensure case-insensitive lookup for the username.
        const user = await users.findOne({ email: username.toLowerCase() });


        // 3. If user is not found, fail authentication.
        // We log it, but the client gets a generic failure message to prevent username enumeration.
        if (!user) {
            plugin.logwarn(`AUTH failed for user: ${username} (not found)`);
            return cb(false);
        }

        const org_id = user.org_id ? user.org_id.toString() : null;

        // reject if the user is not active or does not have an organization ID
        if (!user.active || !org_id) {
            plugin.logwarn(`AUTH failed for user: ${username} (inactive or no org)`);
            connection.notes.auth_message = "Your account is not active or not associated with an organization.";
            return cb(false);
        }

        // If organization ID is present, then check if the username matches the organization's domain.
        const domains = await domains.find({ org_id, status: "verified" }).map(doc => doc.domain.toLowerCase()).toArray();

        if (domains.length > 0) {
            // Check if the username matches any of the organization's domains.
            const domainMatch = domains.some(domain => username.toLowerCase().endsWith(`@${domain}`));
            if (!domainMatch) {
                plugin.logwarn(`AUTH failed for user: ${username} (domain mismatch)`);
                connection.notes.auth_message = "Your email address does not match the organization's domain.";
                return cb(false);
            }
        } else {
            // reject if no verified domains are found for the organization
            plugin.logwarn(`AUTH failed for user: ${username} (no verified domains)`);
            connection.notes.auth_message = "Your organization does not have any verified domains.";
            return cb(false);
        }

        // 4. Compare the provided password with the stored hash.
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            plugin.logwarn(`AUTH failed for user: ${username} (bad password)`);
            return cb(false);
        }

        // 5. Authentication successful!
        plugin.loginfo(connection, `Authenticated user: ${username}`);

        // Set the authenticated user on the connection for Haraka's core and other plugins.
        // We store it in lowercase to make comparisons easier in other hooks.
        connection.set('auth_user', username.toLowerCase());

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

/**
 * hook_mail is called for the 'MAIL FROM' SMTP command.
 * It's used here to enforce that an authenticated user can only send
 * mail from their own email address. This prevents sender spoofing.
 */
exports.hook_mail = function (next, connection, params) {
    const plugin = this;

    // Get the authenticated user. This is set in check_plain_passwd on success.
    const authUser = connection.get('auth_user');
    const mailFrom = params[0].address();

    // If there's no authenticated user, this rule doesn't apply.
    // Assuming this server is for submission, unauthenticated mail should be rejected.
    if (!authUser) {
        plugin.lognotice("MAIL FROM without authentication, denying.");
        return next(DENY, "Authentication required to send mail.");
    }

    // Compare the authenticated user's email with the MAIL FROM address.
    // We compare them in lowercase to avoid case-sensitivity issues.
    if (mailFrom.toLowerCase() !== authUser) {
        plugin.logwarn(`Authenticated user ${authUser} attempted to send as ${mailFrom}.`);
        // Use a 550-series SMTP code for a permanent failure.
        return next(DENY, "Sender address does not match authenticated user.");
    }

    // If the addresses match, the user is authorized.
    plugin.loginfo(`User ${authUser} is authorized to send from ${mailFrom}.`);
    return next(); // Continue to the next plugin
};