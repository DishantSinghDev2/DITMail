// Haraka plugin for unified user authentication against MongoDB.
// Supports both encrypted App Passwords (for internal services)
// and bcrypt-hashed passwords (for end-user email clients).

const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// --- Module-level variables ---
let db, users, domains, appPasswords;
const ALGORITHM = 'aes-256-cbc';
let ENCRYPTION_KEY;

// --- Helper function for decryption ---
function decrypt(text, key, plugin) {
  try {
    const parts = text.split(':');
    if (parts.length < 2) throw new Error('Invalid encrypted text format.');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    plugin.logerror(`Decryption failed: ${e.message}`);
    return null; // Return null on failure
  }
}

// --- Haraka Plugin Registration ---
exports.register = function () {
    const plugin = this;
    plugin.inherits('auth/auth_base');
    plugin.load_mongo_config();
};

exports.load_mongo_config = function () {
    const plugin = this;
    const config = plugin.config.get('auth_mongo_user.ini', {
        booleans: ['main.require_tls'],
    });

    plugin.cfg = {
        uri: process.env.MONGO_URI + '/ditmail' || 'mongodb://127.0.0.1:27017/ditmail',
        userCollection: config.main.collection || 'users',
        appPasswordCollection: config.main.app_password_collection || 'apppasswords',
        domainCollection: 'domains',
        encryption_key: process.env.APP_ENCRYPTION_KEY || '', // Load the key from config
        require_tls: config.main.require_tls !== false,
    };

    // Validate the encryption key
    if (!plugin.cfg.encryption_key) {
        plugin.logcrit("encryption_key is missing in auth_mongo_user.ini. App password auth will fail.");
    } else {
        ENCRYPTION_KEY = Buffer.from(plugin.cfg.encryption_key, 'base64');
        if (ENCRYPTION_KEY.length !== 32) {
            plugin.logcrit("encryption_key must be a 32-byte, base64-encoded string.");
        }
    }

    mongodb.MongoClient.connect(plugin.cfg.uri, { useUnifiedTopology: true })
        .then(client => {
            db = client.db();
            users = db.collection(plugin.cfg.userCollection);
            domains = db.collection(plugin.cfg.domainCollection);
            appPasswords = db.collection(plugin.cfg.appPasswordCollection);
            plugin.loginfo(`Unified Auth: Connected to MongoDB.`);
        })
        .catch(err => {
            plugin.logcrit(`Unified Auth: MongoDB connection failed: ${err.message}`);
        });
};

exports.hook_capabilities = (next, connection) => {
    // Only offer AUTH if the connection is secure (TLS).
    if (connection.tls.enabled) {
        const methods = ['PLAIN', 'LOGIN'];
        connection.capabilities.push(`AUTH ${methods.join(' ')}`);
        connection.notes.allowed_auth_methods = methods;
    }
    next();
};

exports.check_plain_passwd = async function (connection, username, password, cb) {
    const plugin = this;

    if (!users || !appPasswords) {
        plugin.logerror("Unified Auth: MongoDB connection not ready.");
        connection.notes.auth_message = "Server temporarily unavailable.";
        return cb(false);
    }

    try {
        const user = await users.findOne({ email: username.toLowerCase() });

        if (!user) {
            plugin.logwarn(`Unified Auth: User ${username} not found.`);
            return cb(false);
        }

        // --- AUTHENTICATION LOGIC ---
        // 1. Try App Password Authentication FIRST (for automated services)
        if (ENCRYPTION_KEY) {
            const userAppPasswords = await appPasswords.find({ user_id: user._id }).toArray();
            for (const ap of userAppPasswords) {
                const plainTextPassword = decrypt(ap.encrypted_password, ENCRYPTION_KEY, plugin);
                if (plainTextPassword !== null && plainTextPassword === password) {
                    plugin.loginfo(`Unified Auth: User ${username} authenticated successfully via App Password.`);
                    return plugin.on_auth_success(connection, user, cb);
                }
            }
        }
        
        // 2. If App Password auth fails or is not configured, fall back to user password (bcrypt)
        if (user.password_hash) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                plugin.loginfo(`Unified Auth: User ${username} authenticated successfully via main password.`);
                return plugin.on_auth_success(connection, user, cb);
            }
        }

        // 3. If both methods fail, deny access.
        plugin.logwarn(`Unified Auth: All authentication methods failed for user ${username}.`);
        return cb(false);

    } catch (err) {
        plugin.logerror(`Unified Auth: Error for user ${username}: ${err.message}`);
        connection.notes.auth_message = "An error occurred during authentication.";
        return cb(false);
    }
};

/**
 * A helper function to run common logic on successful authentication.
 */
exports.on_auth_success = async function (connection, user, cb) {
    const plugin = this;
    const username = user.email;

    // --- Domain and Access Checks (from your original plugin) ---
    if (!user.mailboxAccess){
        plugin.logwarn(`AUTH failed for user: ${username} (no mailbox access)`);
        connection.notes.auth_message = "Your account does not have SMTP mailbox access.";
        return cb(false);
    }
    
    const org_id = user.org_id ? user.org_id.toString() : null;
    if (!org_id) {
        plugin.logwarn(`AUTH failed for user: ${username} (no org associated)`);
        connection.notes.auth_message = "Your account is not associated with an organization.";
        return cb(false);
    }

    const orgDomains = await domains.find({ org_id: new mongodb.ObjectId(org_id), status: "verified" }).map(doc => doc.domain.toLowerCase()).toArray();
    if (orgDomains.length === 0) {
        plugin.logwarn(`AUTH failed for user: ${username} (no verified domains for org)`);
        connection.notes.auth_message = "Your organization does not have any verified domains.";
        return cb(false);
    }
    
    const domainMatch = orgDomains.some(domain => username.toLowerCase().endsWith(`@${domain}`));
    if (!domainMatch) {
        plugin.logwarn(`AUTH failed for user: ${username} (domain mismatch)`);
        connection.notes.auth_message = "Your email address does not match your organization's domain.";
        return cb(false);
    }
    
    // --- All checks passed ---
    connection.set('auth_user', username.toLowerCase());
    connection.notes.user = user; // Store full user object
    connection.relaying = true; // Allow sending outbound mail
    
    return cb(true);
};

exports.hook_mail = function (next, connection, params) {
    const authUser = connection.get('auth_user');
    if (!authUser) {
        return next(DENY, "Authentication required.");
    }

    const mailFrom = params[0].address();
    if (mailFrom.toLowerCase() !== authUser) {
        this.logwarn(`Authenticated user ${authUser} attempted to send as ${mailFrom}.`);
        return next(DENY, "Sender address does not match authenticated user.");
    }

    return next();
};