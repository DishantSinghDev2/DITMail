# DITMail Configuration Guide

This document covers all configuration options for DITMail SMTP server.

## Configuration Files Overview

\`\`\`
config/
├── smtp.ini          # Main SMTP server settings
├── plugins           # Plugin loading order
├── tls.ini           # SSL/TLS configuration
├── dkim_sign.ini     # DKIM signing settings
├── auth.ini          # Authentication settings
├── redis.ini         # Redis connection settings
└── domains.ini       # Domain-specific settings
\`\`\`

## Main SMTP Configuration

### smtp.ini

\`\`\`ini
[main]
# Listening addresses and ports
listen=0.0.0.0:25,0.0.0.0:587,0.0.0.0:465

# Process settings
user=haraka
group=haraka
daemon=true
pid_file=/var/run/haraka.pid

# Connection limits
max_connections=1000
max_unrecognized_commands=10
max_line_length=512
max_data_size=26214400

[logging]
level=INFO
format=DEFAULT
timestamps=true
syslog_facility=16

[performance]
# Memory and CPU optimization
nodes=auto
workers=auto
max_connections_per_worker=100
\`\`\`

## TLS/SSL Configuration

### tls.ini

\`\`\`ini
[main]
# Certificate files
key=/etc/ssl/private/mail.key
cert=/etc/ssl/certs/mail.crt

# Security settings
ciphers=ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256
honorCipherOrder=true
requestCert=false
rejectUnauthorized=false

# Protocol versions
secureProtocol=TLSv1_2_method
minVersion=TLSv1.2
maxVersion=TLSv1.3

[outbound]
# Outbound TLS settings
key=/etc/ssl/private/mail.key
cert=/etc/ssl/certs/mail.crt
verify=true
\`\`\`

## Authentication Configuration

### auth.ini

\`\`\`ini
[main]
# Authentication methods
methods=PLAIN,LOGIN,CRAM-MD5

# Security settings
require_tls=true
allow_plain_on_insecure=false
max_auth_attempts=3
auth_timeout=30

[redis]
host=localhost
port=6379
db=0
password=

[rate_limiting]
max_attempts_per_hour=100
max_attempts_per_day=1000
lockout_duration=3600
\`\`\`

## DKIM Configuration

### dkim_sign.ini

\`\`\`ini
[main]
disabled=false
selector=default

[dkim]
# Headers to sign
headers_to_sign=from:sender:reply-to:subject:date:message-id:to:cc:mime-version:content-type:content-transfer-encoding:content-id:content-description:resent-date:resent-from:resent-sender:resent-to:resent-cc:resent-message-id:in-reply-to:references:list-id:list-help:list-unsubscribe:list-subscribe:list-post:list-owner:list-archive

# Canonicalization
header_canon=relaxed
body_canon=relaxed

# Key settings
key_size=2048
algorithm=rsa-sha256

[key_dir]
path=/etc/haraka/dkim
\`\`\`

## Redis Configuration

### redis.ini

\`\`\`ini
[main]
host=localhost
port=6379
db=0
password=
connect_timeout=5000
command_timeout=5000

[pool]
max_connections=10
min_connections=2
idle_timeout=30000

[clustering]
enabled=false
nodes=localhost:6379
\`\`\`

## Domain Configuration

### domains.ini

\`\`\`ini
[main]
# Default domain settings
default_quota=1GB
max_users_per_domain=1000
require_domain_verification=true

[features]
# Available features per domain
webmail=true
calendar=true
contacts=true
file_sharing=false
two_factor_auth=true

[limits]
# Per-domain limits
daily_send_limit=10000
hourly_send_limit=1000
max_recipients_per_message=100
max_message_size=25MB
\`\`\`

## Plugin Configuration

### Core Plugins

\`\`\`txt
# Essential plugins (load order matters)
process_title
log.syslog
tls
max_unrecognized_commands
early_talker

# Authentication
auth/auth_base
ditmail_auth

# Security and anti-spam
spf
dkim_verify
dkim_sign
ditmail_dkim
ditmail_spf

# Content filtering
data.headers
attachment
clamd

# Routing and delivery
rcpt_to.routes
mail_from.is_resolvable
ditmail_domains
ditmail_users
ditmail_delivery

# Queue management
queue/smtp_forward
ditmail_queue

# Monitoring
watch
\`\`\`

### Plugin-Specific Configuration

#### SPF Configuration (spf.ini)

\`\`\`ini
[main]
# SPF checking behavior
timeout=30
mfrom_fallback=helo
relay_deny_all=true

[results]
# What to do with SPF results
pass=continue
fail=reject
softfail=continue
neutral=continue
temperror=tempfail
permerror=reject
none=continue
\`\`\`

#### Anti-Virus Configuration (clamd.ini)

\`\`\`ini
[main]
# ClamAV daemon settings
host=localhost
port=3310
timeout=30
max_size=26214400

[actions]
# What to do when virus found
virus_found=reject
scan_error=tempfail
\`\`\`

## Advanced Configuration

### Rate Limiting

\`\`\`javascript
// config/rate_limits.json
{
  "connection": {
    "per_ip": 10,
    "per_hour": 100,
    "per_day": 1000
  },
  "authentication": {
    "max_attempts": 5,
    "lockout_duration": 3600,
    "per_ip_per_hour": 20
  },
  "sending": {
    "per_user_per_hour": 100,
    "per_user_per_day": 1000,
    "per_domain_per_hour": 10000
  }
}
\`\`\`

### Queue Configuration

\`\`\`javascript
// config/queue.json
{
  "retry_intervals": [300, 900, 1800, 3600, 7200, 14400],
  "max_attempts": 6,
  "bounce_after": 432000,
  "temp_fail_intervals": [60, 300, 900],
  "delivery_concurrency": 10,
  "max_queue_size": 100000
}
\`\`\`

### Monitoring Configuration

\`\`\`javascript
// config/monitoring.json
{
  "metrics": {
    "enabled": true,
    "port": 9090,
    "path": "/metrics"
  },
  "health_check": {
    "enabled": true,
    "port": 8080,
    "path": "/health"
  },
  "alerts": {
    "email": "admin@yourdomain.com",
    "webhook": "https://your-webhook-url.com",
    "thresholds": {
      "queue_size": 1000,
      "error_rate": 0.05,
      "connection_rate": 100
    }
  }
}
\`\`\`

## Environment Variables

\`\`\`bash
# Core settings
HARAKA_CONFIG_DIR=/etc/haraka
HARAKA_LOG_LEVEL=INFO
HARAKA_USER=haraka
HARAKA_GROUP=haraka

# Redis settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# SSL/TLS settings
TLS_KEY_PATH=/etc/ssl/private/mail.key
TLS_CERT_PATH=/etc/ssl/certs/mail.crt

# Security settings
REQUIRE_TLS=true
MAX_AUTH_ATTEMPTS=3
AUTH_TIMEOUT=30

# Performance settings
MAX_CONNECTIONS=1000
MAX_WORKERS=auto
QUEUE_CONCURRENCY=10

# Feature flags
ENABLE_WEBMAIL=true
ENABLE_CALENDAR=true
ENABLE_CONTACTS=true
ENABLE_MONITORING=true
\`\`\`

## Security Hardening

### Firewall Configuration

\`\`\`bash
# UFW rules for DITMail
sudo ufw allow from any to any port 25 proto tcp
sudo ufw allow from any to any port 587 proto tcp
sudo ufw allow from any to any port 465 proto tcp
sudo ufw allow from any to any port 993 proto tcp
sudo ufw allow from any to any port 995 proto tcp

# Restrict management ports
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 9090 proto tcp
\`\`\`

### Fail2Ban Configuration

\`\`\`ini
# /etc/fail2ban/jail.local
[ditmail-smtp]
enabled = true
port = smtp,submission,smtps
filter = ditmail-smtp
logpath = /var/log/haraka/mail.log
maxretry = 5
bantime = 3600
findtime = 600

[ditmail-auth]
enabled = true
port = smtp,submission,smtps
filter = ditmail-auth
logpath = /var/log/haraka/mail.log
maxretry = 3
bantime = 7200
findtime = 300
\`\`\`

### Access Control Lists

\`\`\`javascript
// config/access_control.json
{
  "whitelist": {
    "ips": ["127.0.0.1", "::1"],
    "networks": ["192.168.1.0/24", "10.0.0.0/8"],
    "domains": ["trusted-domain.com"]
  },
  "blacklist": {
    "ips": ["192.0.2.1"],
    "networks": ["198.51.100.0/24"],
    "domains": ["spam-domain.com"]
  },
  "greylist": {
    "enabled": true,
    "delay": 300,
    "retry_window": 3600,
    "expire_time": 86400
  }
}
\`\`\`

## Performance Tuning

### System Limits

\`\`\`bash
# /etc/security/limits.conf
haraka soft nofile 65536
haraka hard nofile 65536
haraka soft nproc 32768
haraka hard nproc 32768

# /etc/systemd/system/ditmail.service
[Service]
LimitNOFILE=65536
LimitNPROC=32768
\`\`\`

### Memory Optimization

\`\`\`javascript
// config/performance.json
{
  "memory": {
    "max_heap_size": "2048m",
    "gc_interval": 60000,
    "cache_size": "256m"
  },
  "connections": {
    "keep_alive": true,
    "timeout": 300000,
    "max_per_ip": 10
  },
  "queue": {
    "batch_size": 100,
    "flush_interval": 5000,
    "max_memory_usage": "512m"
  }
}
\`\`\`

## Backup Configuration

### Automated Backups

\`\`\`bash
#!/bin/bash
# /etc/cron.daily/ditmail-backup

BACKUP_DIR="/var/backups/ditmail"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup configuration
tar -czf "$BACKUP_DIR/$DATE/config.tar.gz" /etc/haraka/

# Backup Redis data
redis-cli --rdb "$BACKUP_DIR/$DATE/redis.rdb"

# Backup DKIM keys
tar -czf "$BACKUP_DIR/$DATE/dkim.tar.gz" /etc/haraka/dkim/

# Backup SSL certificates
tar -czf "$BACKUP_DIR/$DATE/ssl.tar.gz" /etc/ssl/certs/mail.* /etc/ssl/private/mail.*

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;
\`\`\`

## Monitoring and Logging

### Log Rotation

\`\`\`bash
# /etc/logrotate.d/ditmail
/var/log/haraka/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 haraka haraka
    postrotate
        systemctl reload ditmail
    endscript
}
\`\`\`

### Metrics Collection

\`\`\`javascript
// config/metrics.json
{
  "prometheus": {
    "enabled": true,
    "port": 9090,
    "metrics": [
      "connections_total",
      "messages_processed",
      "authentication_attempts",
      "queue_size",
      "delivery_time",
      "error_rate"
    ]
  },
  "statsd": {
    "enabled": false,
    "host": "localhost",
    "port": 8125,
    "prefix": "ditmail"
  }
}
\`\`\`

## Troubleshooting

### Debug Configuration

\`\`\`ini
# config/smtp.ini (debug mode)
[logging]
level=DEBUG
format=LOGFMT
timestamps=true
file=/var/log/haraka/debug.log

[debug]
enabled=true
plugins=true
connections=true
transactions=true
\`\`\`

### Common Configuration Issues

1. **Permission Errors**: Ensure haraka user owns all config files
2. **SSL Certificate Issues**: Verify certificate paths and permissions
3. **Redis Connection**: Check Redis service status and connectivity
4. **DNS Resolution**: Verify system DNS configuration
5. **Port Conflicts**: Ensure no other services use SMTP ports

### Configuration Validation

\`\`\`bash
# Test configuration syntax
haraka -c ./config --test

# Validate specific plugin
haraka -c ./config --test-plugin ditmail_auth

# Check SSL certificate
openssl x509 -in /etc/ssl/certs/mail.crt -text -noout
\`\`\`

## Best Practices

1. **Version Control**: Keep configurations in Git
2. **Environment Separation**: Use different configs for dev/staging/prod
3. **Security First**: Always use TLS and strong authentication
4. **Monitor Everything**: Set up comprehensive monitoring
5. **Regular Backups**: Automate configuration and data backups
6. **Documentation**: Document all custom configurations
7. **Testing**: Test configuration changes in staging first

## Next Steps

- [Security Configuration](./docs/SECURITY.md)
- [User Management](./docs/USER_MANAGEMENT.md)
- [Monitoring Setup](./docs/MONITORING.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
