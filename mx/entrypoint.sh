#!/bin/bash
set -e

echo "[DITMail] Starting entrypoint..."

# --- Configuration from Environment Variables ---
REDIS_URL="${REDIS_URL:-redis://redis:6379}"
LOG_LEVEL="${HARAKA_LOGLEVEL:-info}"
CONFIG_DIR="/DITMail/src/config"
TLS_DOMAIN="${TLS_DOMAIN}"

echo "[DITMail] Configuring Haraka with:"
echo "  Redis URL: $REDIS_URL"
echo "  Log Level: $LOG_LEVEL"
echo "  TLS Domain: $TLS_DOMAIN"

# --- Helper function: update or append config values ---
set_config_value() {
  local file=$1
  local key=$2
  local value=$3

  if [[ -f "$file" ]]; then
    if grep -qE "^$key=" "$file"; then
      sed -i "s|^$key=.*|$key=$value|" "$file"
    else
      echo "$key=$value" >> "$file"
    fi
  else
    echo "[WARN] Config file $file not found for setting $key"
  fi
}

# --- Extract Redis Host and Port from REDIS_URL ---
REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:/]+)(:([0-9]+))?.*|\1|')
REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|redis://[^:/]+:([0-9]+).*|\1|')

# Default port if not found
if [[ -z "$REDIS_PORT" || "$REDIS_PORT" == "$REDIS_URL" ]]; then
  REDIS_PORT=6379
fi

echo "  Redis Host: $REDIS_HOST"
echo "  Redis Port: $REDIS_PORT"

# --- Apply Configurations ---
set_config_value "$CONFIG_DIR/redis.ini" "url" "$REDIS_URL"
set_config_value "$CONFIG_DIR/redis.ini" "host" "$REDIS_HOST"
set_config_value "$CONFIG_DIR/redis.ini" "port" "$REDIS_PORT"
set_config_value "$CONFIG_DIR/log.ini" "level" "$LOG_LEVEL"

# (Optional: if you want these also available in other config files, repeat for each target .ini)

# --- Wait for TLS Certificates ---
if [[ -z "$TLS_DOMAIN" ]]; then
  echo "[WARN] TLS_DOMAIN is not set. Skipping certificate wait. Haraka may fail if TLS is enabled."
else
  TLS_CERT_PATH="/etc/letsencrypt/live/$TLS_DOMAIN/fullchain.pem"
  TLS_KEY_PATH="/etc/letsencrypt/live/$TLS_DOMAIN/privkey.pem"
  
  echo "[DITMail] Waiting for TLS certs for domain '$TLS_DOMAIN'..."
  for i in {1..30}; do
    if [[ -f "$TLS_CERT_PATH" && -f "$TLS_KEY_PATH" ]]; then
      echo "[DITMail] TLS certificates found."
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
