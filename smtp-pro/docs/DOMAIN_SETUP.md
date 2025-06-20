# Domain Setup Guide

This guide covers adding and configuring domains in DITMail.

## Adding a New Domain

### 1. Add Domain to DITMail

\`\`\`bash
npm run add-domain example.com
\`\`\`

This command will:
- Generate DKIM keys
- Create domain configuration
- Output required DNS records

### 2. Configure DNS Records

Add the following DNS records to your domain:

#### MX Record
\`\`\`
example.com.    IN    MX    10    mail.example.com.
\`\`\`

#### A Record (Mail Server)
\`\`\`
mail.example.com.    IN    A    YOUR_SERVER_IP
\`\`\`

#### DKIM Record
\`\`\`
default._domainkey.example.com.    IN    TXT    "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
\`\`\`

#### SPF Record
\`\`\`
example.com.    IN    TXT    "v=spf1 mx a:mail.example.com -all"
\`\`\`

#### DMARC Record
\`\`\`
_dmarc.example.com.    IN    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
\`\`\`

#### PTR Record (Reverse DNS)
Contact your hosting provider to set up reverse DNS:
\`\`\`
YOUR_SERVER_IP    IN    PTR    mail.example.com.
\`\`\`

### 3. Verify DNS Propagation

\`\`\`bash
# Check MX record
dig MX example.com

# Check DKIM
dig TXT default._domainkey.example.com

# Check SPF
dig TXT example.com

# Check DMARC
dig TXT _dmarc.example.com
\`\`\`

## Domain Configuration Options

### Basic Configuration

\`\`\`javascript
// Domain settings stored in Redis
{
  "status": "active",           // active, inactive, suspended
  "dkim_selector": "default",   // DKIM selector
  "max_users": 100,            // Maximum users for domain
  "quota_default": "1GB",      // Default user quota
  "created": 1640995200000,    // Creation timestamp
  "updated": 1640995200000     // Last update timestamp
}
\`\`\`

### Advanced Configuration

\`\`\`javascript
{
  "status": "active",
  "dkim_selector": "default",
  "max_users": 1000,
  "quota_default": "5GB",
  "features": {
    "webmail": true,
    "calendar": true,
    "contacts": true,
    "file_sharing": false
  },
  "security": {
    "require_tls": true,
    "min_password_length": 8,
    "two_factor_required": false
  },
  "limits": {
    "daily_send_limit": 1000,
    "hourly_send_limit": 100,
    "max_recipients_per_message": 50
  }
}
\`\`\`

## Managing Domains

### List All Domains

\`\`\`bash
node -e "
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {
  client.sMembers('domains:active').then(domains => {
    console.log('Active domains:', domains);
    client.disconnect();
  });
});
"
\`\`\`

### Update Domain Configuration

\`\`\`bash
node -e "
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {
  client.hSet('domain:example.com', {
    'max_users': '500',
    'quota_default': '2GB',
    'updated': Date.now()
  }).then(() => {
    console.log('Domain updated');
    client.disconnect();
  });
});
"
\`\`\`

### Suspend Domain

\`\`\`bash
node -e "
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {
  client.hSet('domain:example.com', 'status', 'suspended').then(() => {
    console.log('Domain suspended');
    client.disconnect();
  });
});
"
\`\`\`

## SSL/TLS Configuration

### Wildcard Certificate

For multiple subdomains, use a wildcard certificate:

\`\`\`bash
# Get wildcard certificate
sudo certbot certonly --dns-cloudflare -d "*.example.com" -d "example.com"

# Update Haraka configuration
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem /etc/ssl/certs/mail.crt
sudo cp /etc/letsencrypt/live/example.com/privkey.pem /etc/ssl/private/mail.key
\`\`\`

### Per-Domain Certificates

For individual domain certificates:

\`\`\`bash
# Get certificate for specific domain
sudo certbot certonly --standalone -d mail.example.com

# Configure in Haraka
# Edit config/tls.ini to specify per-domain certificates
\`\`\`

## Email Routing

### Internal Routing

Configure routing for local domains:

\`\`\`javascript
// config/host_list_regex
^example\.com$
^subdomain\.example\.com$
\`\`\`

### External Routing

Configure smart host routing:

\`\`\`javascript
// config/smtp_forward.ini
[example.com]
host=smtp.example.com
port=587
auth_user=relay@example.com
auth_pass=password
\`\`\`

## Subdomain Configuration

### Automatic Subdomain Handling

\`\`\`javascript
// In ditmail_domains plugin
exports.check_subdomain = function(domain) {
    const parts = domain.split('.');
    if (parts.length > 2) {
        const parentDomain = parts.slice(-2).join('.');
        return this.is_managed_domain(parentDomain);
    }
    return false;
};
\`\`\`

### Manual Subdomain Setup

\`\`\`bash
# Add subdomain as separate domain
npm run add-domain mail.example.com

# Or configure as alias
node -e "
const redis = require('redis');
const client = redis.createClient();
client.connect().then(() => {
  client.hSet('domain:mail.example.com', {
    'status': 'alias',
    'parent_domain': 'example.com'
  });
});
"
\`\`\`

## Domain Verification

### Automated Verification

\`\`\`javascript
// scripts/verify-domain.js
const dns = require('dns').promises;

async function verifyDomain(domain) {
    try {
        // Check MX record
        const mxRecords = await dns.resolveMx(domain);
        console.log('MX Records:', mxRecords);
        
        // Check DKIM
        const dkimRecord = await dns.resolveTxt(`default._domainkey.${domain}`);
        console.log('DKIM Record:', dkimRecord);
        
        // Check SPF
        const spfRecord = await dns.resolveTxt(domain);
        console.log('SPF Record:', spfRecord.filter(r => r.join('').includes('v=spf1')));
        
        return true;
    } catch (error) {
        console.error('Verification failed:', error.message);
        return false;
    }
}
\`\`\`

### Manual Verification

\`\`\`bash
# Verify MX record points to your server
dig MX example.com

# Test SMTP connection
telnet mail.example.com 25

# Test mail delivery
echo "Test" | mail -s "Test" test@example.com
\`\`\`

## Troubleshooting

### Common Issues

1. **DNS not propagating**: Wait 24-48 hours or use different DNS servers
2. **DKIM verification failing**: Check public key format and DNS record
3. **Mail rejected**: Verify SPF and reverse DNS configuration
4. **SSL errors**: Ensure certificates are valid and accessible

### Diagnostic Commands

\`\`\`bash
# Test DNS resolution
nslookup -type=MX example.com

# Test SMTP connection
openssl s_client -connect mail.example.com:587 -starttls smtp

# Check certificate
openssl x509 -in /etc/ssl/certs/mail.crt -text -noout

# Test mail delivery
swaks --to test@example.com --from sender@yourdomain.com --server mail.example.com
\`\`\`

### Log Analysis

\`\`\`bash
# Check domain-specific logs
grep "example.com" /var/log/haraka/mail.log

# Monitor real-time activity
tail -f /var/log/haraka/mail.log | grep "example.com"
\`\`\`

## Best Practices

1. **Always verify DNS before going live**
2. **Use strong DKIM keys (2048-bit minimum)**
3. **Implement proper SPF policies**
4. **Monitor DMARC reports**
5. **Keep certificates updated**
6. **Regular domain health checks**
7. **Backup domain configurations**

## Next Steps

- [User Management](./USER_MANAGEMENT.md)
- [Security Configuration](./SECURITY.md)
- [Monitoring Setup](./MONITORING.md)
