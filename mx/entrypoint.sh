#!/bin/bash
set -e

echo "[DITMail] Starting entrypoint..."

# --- Configuration from Environment Variables ---
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
LOG_LEVEL="${HARAKA_LOGLEVEL:-info}"
CONFIG_DIR="/DITMail/src/config"
TLS_DOMAIN="${TLS_DOMAIN}"

echo "[DITMail] Configuring Haraka with:"
echo "  Redis Host: $REDIS_HOST"
echo "  Redis Port: $REDIS_PORT"

# --- Helper function to ensure a [redis] section exists and set values ---
set_redis_config() {
  local file=$1
  echo "[DITMail] Forcing Redis config in $file..."

  # Ensure the [redis] section header exists
  if ! grep -q "\[redis\]" "$file"; then
    echo -e "\n[redis]" >> "$file"
  fi

  # Set host
  if grep -qE "^host=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^host\s*=.*/host = $REDIS_HOST/" "$file"
  else
    sed -i "/^\[redis\]/a host = $REDIS_HOST" "$file"
  fi

  # Set port
  if grep -qE "^port=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^port\s*=.*/port = $REDIS_PORT/" "$file"
  else
    sed -i "/^\[redis\]/a port = $REDIS_PORT" "$file"
  fi

  # Set password
  if grep -qE "^password=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^password\s*=.*/password = $REDIS_PASSWORD/" "$file"
  else
    sed -i "/^\[redis\]/a password = $REDIS_PASSWORD" "$file"
  fi
}

# --- Apply Configurations Explicitly ---
# List of all config files for plugins that use Redis
REDIS_CONFIG_FILES=(
  "redis.ini"
  "karma.ini"
  "stats.redis.ini"
  "queue.redis.mongo.ini"
)

for config_file in "${REDIS_CONFIG_FILES[@]}"; do
  if [ -f "$CONFIG_DIR/$config_file" ]; then
    set_redis_config "$CONFIG_DIR/$config_file"
  fi
done

# Update log level
sed -i "s/^level\s*=.*/level = $LOG_LEVEL/" "$CONFIG_DIR/log.ini"


# --- Wait for TLS Certificates ---
if [[ -z "$TLS_DOMAIN" ]]; then
  echo "[WARN] TLS_DOMAIN is not set. Skipping certificate wait."
else
  # ... (The rest of your TLS wait logic is correct and can stay here)
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