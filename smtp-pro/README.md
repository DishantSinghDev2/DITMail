# DITMail - Enterprise SMTP Server

A complete SMTP server solution built with Haraka, designed to compete with services like Zoho Mail. Features custom domain support, advanced security, and seamless IMAP integration.

## 🚀 Features

- **Custom Domain Support** - Host email for any domain
- **SMTP Send/Receive** - Full bidirectional email handling
- **Security First** - DKIM, SPF, DMARC, and TLS encryption
- **SMTP Authentication** - User management and relay control
- **Maildir Delivery** - Compatible with Dovecot IMAP
- **Auto Configuration** - Automated domain setup and DNS helpers
- **Queue Management** - Reliable email delivery with retry logic
- **Web Dashboard** - Domain and user management interface

## 📋 Requirements

- Node.js 18+
- Redis (for queuing and sessions)
- Dovecot (for IMAP)
- OpenSSL (for certificate generation)
- DNS access (for domain verification)

## 🛠 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Initialize configuration
npm run setup

# Start the server
npm start
\`\`\`

## 📁 Project Structure

\`\`\`
ditmail-smtp/
├── config/           # Haraka configuration
├── plugins/          # Custom Haraka plugins
├── scripts/          # Setup and maintenance scripts
├── docs/            # Documentation
├── web/             # Management dashboard
└── ssl/             # SSL certificates
\`\`\`

## 🔧 Configuration

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed setup instructions.

## 📖 Documentation

- [Installation Guide](./docs/INSTALLATION.md)
- [Domain Setup](./docs/DOMAIN_SETUP.md)
- [Security Configuration](./docs/SECURITY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.
