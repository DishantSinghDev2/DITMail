# DITMail Installation Guide

This guide will walk you through installing and configuring DITMail SMTP server on a fresh Ubuntu/Debian server.

## Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name with DNS control
- Static IP address

## System Requirements

- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB, recommended 100GB+
- **CPU**: 2+ cores recommended
- **Network**: Static IP with ports 25, 587, 465, 993, 995 open

## Step 1: System Preparation

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget gnupg2 software-properties-common

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server

# Install Dovecot (for IMAP)
sudo apt install -y dovecot-core dovecot-imapd dovecot-lmtpd

# Install additional tools
sudo apt install -y openssl certbot nginx
\`\`\`

## Step 2: Create System User

\`\`\`bash
# Create haraka user
sudo useradd -r -s /bin/false -d /var/lib/haraka haraka
sudo mkdir -p /var/lib/haraka
sudo chown haraka:haraka /var/lib/haraka

# Create mail directories
sudo mkdir -p /var/mail
sudo chown haraka:haraka /var/mail
\`\`\`

## Step 3: Install DITMail

\`\`\`bash
# Clone repository
git clone https://github.com/DishIs/ditmail.git
cd ditmail/smtp-pro

# Install dependencies
npm install

# Run setup script
sudo npm run setup

# Set permissions
sudo chown -R haraka:haraka /etc/haraka
sudo chmod -R 755 /etc/haraka
sudo chmod 600 /etc/haraka/dkim/*/private.key
\`\`\`

## Step 4: Configure Firewall

\`\`\`bash
# Allow SMTP ports
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
sudo ufw allow 465/tcp

# Allow IMAP ports
sudo ufw allow 993/tcp
sudo ufw allow 995/tcp

# Allow HTTP/HTTPS for web interface
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
\`\`\`

## Step 5: SSL Certificates

### Option A: Let's Encrypt (Recommended)

\`\`\`bash
# Get certificate for your mail server
sudo certbot certonly --standalone -d mail.yourdomain.com

# Copy certificates to Haraka directory
sudo cp /etc/letsencrypt/live/mail.yourdomain.com/fullchain.pem /etc/ssl/certs/mail.crt
sudo cp /etc/letsencrypt/live/mail.yourdomain.com/privkey.pem /etc/ssl/private/mail.key
sudo chown haraka:haraka /etc/ssl/certs/mail.crt /etc/ssl/private/mail.key
\`\`\`

### Option B: Self-Signed (Development Only)

\`\`\`bash
# Generate self-signed certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/mail.key -out /etc/ssl/certs/mail.crt -days 365 -nodes
sudo chown haraka:haraka /etc/ssl/certs/mail.crt /etc/ssl/private/mail.key
\`\`\`

## Step 6: Configure Redis

\`\`\`bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Ensure these settings:
# bind 127.0.0.1
# port 6379
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
\`\`\`

## Step 7: Configure Dovecot (IMAP)

\`\`\`bash
# Edit main configuration
sudo nano /etc/dovecot/dovecot.conf
\`\`\`

Add these configurations:

\`\`\`
# Enable protocols
protocols = imap lmtp

# Listen on all interfaces
listen = *

# Mail location (Maildir format)
mail_location = maildir:/var/mail/%u/Maildir

# Authentication
auth_mechanisms = plain login

# SSL configuration
ssl = required
ssl_cert = </etc/ssl/certs/mail.crt
ssl_key = </etc/ssl/private/mail.key

# User authentication
passdb {
  driver = lua
  args = file=/etc/dovecot/auth-ditmail.lua
}

userdb {
  driver = lua
  args = file=/etc/dovecot/auth-ditmail.lua
}
\`\`\`

Create Dovecot authentication script:

\`\`\`bash
sudo nano /etc/dovecot/auth-ditmail.lua
\`\`\`

\`\`\`lua
local redis = require "redis"
local bcrypt = require "bcrypt"

local client = redis.connect("127.0.0.1", 6379)

function auth_password_verify(request, password)
    local user = request.user
    local user_data = client:hgetall("user:" .. user)
    
    if not user_data or not user_data.password then
        return dovecot.auth.PASSDB_RESULT_USER_UNKNOWN
    end
    
    if bcrypt.verify(password, user_data.password) then
        return dovecot.auth.PASSDB_RESULT_OK
    else
        return dovecot.auth.PASSDB_RESULT_PASSWORD_MISMATCH
    end
end

function auth_userdb_lookup(request)
    local user = request.user
    local user_data = client:hgetall("user:" .. user)
    
    if not user_data then
        return dovecot.auth.USERDB_RESULT_USER_UNKNOWN
    end
    
    return dovecot.auth.USERDB_RESULT_OK, {
        uid = "haraka",
        gid = "haraka",
        home = "/var/mail/" .. user,
        mail = "maildir:/var/mail/" .. user .. "/Maildir"
    }
end
\`\`\`

## Step 8: Start Services

\`\`\`bash
# Install systemd service
sudo cp ditmail.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start and enable services
sudo systemctl start ditmail
sudo systemctl enable ditmail

sudo systemctl restart dovecot
sudo systemctl enable dovecot

# Check status
sudo systemctl status ditmail
sudo systemctl status dovecot
\`\`\`

## Step 9: Add Your First Domain

\`\`\`bash
# Add domain
npm run add-domain yourdomain.com

# The script will output DNS records to configure
\`\`\`

## Step 10: Configure DNS

Add the DNS records output by the add-domain script:

1. **MX Record**: Points to your mail server
2. **A Record**: IP address of your mail server
3. **DKIM Record**: Public key for email signing
4. **SPF Record**: Authorized sending servers
5. **DMARC Record**: Email authentication policy
6. **PTR Record**: Reverse DNS (contact your hosting provider)

## Step 11: Test Installation

\`\`\`bash
# Test SMTP connection
telnet localhost 25

# Test authentication
npm run test

# Check logs
sudo journalctl -u ditmail -f
\`\`\`

## Step 12: Web Dashboard (Optional)

\`\`\`bash
# Start web interface
npm run web

# Access at http://your-server-ip:3000
\`\`\`

## Troubleshooting

### Common Issues

1. **Port 25 blocked**: Many ISPs block port 25. Contact your provider or use a VPS.

2. **SSL certificate errors**: Ensure certificates are valid and readable by haraka user.

3. **DNS propagation**: DNS changes can take up to 48 hours to propagate.

4. **Firewall blocking**: Ensure all required ports are open.

### Log Files

- **Haraka logs**: `/var/log/haraka/`
- **System logs**: `sudo journalctl -u ditmail`
- **Dovecot logs**: `/var/log/dovecot/`

### Testing Commands

\`\`\`bash
# Test SMTP
echo "Test message" | mail -s "Test" user@yourdomain.com

# Test DKIM
dig TXT default._domainkey.yourdomain.com

# Test SPF
dig TXT yourdomain.com

# Check mail queue
sudo find /var/mail -name "new" -exec ls -la {} \;
\`\`\`

## Security Hardening

1. **Fail2ban**: Install to prevent brute force attacks
2. **Regular updates**: Keep system and packages updated
3. **Monitoring**: Set up log monitoring and alerts
4. **Backups**: Regular backups of configuration and mail data
5. **Rate limiting**: Configure connection and sending limits

## Next Steps

- [Domain Setup Guide](./DOMAIN_SETUP.md)
- [Security Configuration](./SECURITY.md)
- [User Management](./USER_MANAGEMENT.md)
- [Monitoring and Maintenance](./MONITORING.md)
