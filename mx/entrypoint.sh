#!/bin/bash
set -e

echo "[DITMail] Starting entrypoint..."

# --- Configuration from Environment Variables ---
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}" # No default for password
LOG_LEVEL="${HARAKA_LOGLEVEL:-info}"
CONFIG_DIR="/DITMail/src/config"
TLS_DOMAIN="${TLS_DOMAIN}"

echo "[DITMail] Configuring Haraka with:"
echo "  Redis Host: $REDIS_HOST"
echo "  Redis Port: $REDIS_PORT"
echo "  Log Level: $LOG_LEVEL"
echo "  TLS Domain: $TLS_DOMAIN"

# --- Apply Configurations using sed (robustly) ---
# Update the host in the [server] section
sed -i "/^\[server\]/,/^\[/ s/^host\s*=.*/host = $REDIS_HOST/" "$CONFIG_DIR/redis.ini"
# Update the port in the [server] section
sed -i "/^\[server\]/,/^\[/ s/^port\s*=.*/port = $REDIS_PORT/" "$CONFIG_DIR/redis.ini"
# Update the password in the [opts] section
sed -i "/^\[opts\]/,/^\[/ s/^;*password\s*=.*/password = $REDIS_PASSWORD/" "$CONFIG_DIR/redis.ini"

# Update log level
sed -i "s/^level\s*=.*/level = $LOG_LEVEL/" "$CONFIG_DIR/log.ini"


# --- Wait for TLS Certificates ---
if [[ -z "$TLS_DOMAIN" ]]; then
  echo "[WARN] TLS_DOMAIN is not set. Skipping certificate wait."
else
  TLS_CERT_PATH="/etc/letsencrypt/live/$TLS_DOMAIN/fullchain.pem"
  TLS_KEY_PATH="/etc/letsencrypt/live/$TLS_DOMAIN/privkey.pem"
  
  echo "[DITMail] Waiting for TLS certs for domain '$TLS_DOMAIN'..."
  for i in {1..30}; do
    if [[ -f "$TLS_CERT_PATH" && -f "$TLS_KEY_PATH" ]]; then
      echo "[DITMail] TLS certs found."
      break
    fi
    echo "[DITMail] TLS certs not found, retrying ($i/30)..."
    sleep 2
  done

  if [[ ! -f "$TLS_CERT_PATH" || ! -f "$TLS_KEY_PATH" ]]; then
    echo "[ERROR] Timed out waiting for TLS certificates. Exiting."
    exit 1
  fi
fi

echo "[DITMail] Launching Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf