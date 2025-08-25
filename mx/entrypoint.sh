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

CLAMAV_HOST="${CLAMAV_HOST:-clamav}"
CLAMAV_PORT="${CLAMAV_PORT:-3310}"

echo "[DITMail] Configuring Haraka with:"
echo "  Redis Host: $REDIS_HOST"
echo "  Redis Port: $REDIS_PORT"
echo "  ClamAV Host: $CLAMAV_HOST"
echo "  ClamAV Port: $CLAMAV_PORT"

# --- Special handler for redis.ini ---
set_main_redis_config() {
  local file=$1
  echo "[DITMail] Patching $file (main redis.ini style)..."

  if grep -qE "^\s*host\s*=" "$file"; then
    sed -i "/^\[server\]/,/^\[/ s/^\s*host\s*=.*/host = $REDIS_HOST/" "$file"
  else
    sed -i "/^\[server\]/a host = $REDIS_HOST" "$file"
  fi

  if grep -qE "^\s*port\s*=" "$file"; then
    sed -i "/^\[server\]/,/^\[/ s/^\s*port\s*=.*/port = $REDIS_PORT/" "$file"
  else
    sed -i "/^\[server\]/a port = $REDIS_PORT" "$file"
  fi

  if ! grep -q "^\[opts\]" "$file"; then
    echo -e "\n[opts]" >> "$file"
  fi

  if grep -qE "^\s*password\s*=" "$file"; then
    sed -i "/^\[opts\]/,/^\[/ s/^\s*password\s*=.*/password = $REDIS_PASSWORD/" "$file"
  else
    sed -i "/^\[opts\]/a password = $REDIS_PASSWORD" "$file"
  fi
}

# --- Generic redis handler for plugins ---
set_plugin_redis_config() {
  local file=$1
  echo "[DITMail] Forcing Redis config in $file..."

  if ! grep -q "^\[redis\]" "$file"; then
    echo -e "\n[redis]" >> "$file"
  fi

  if grep -qE "^host\s*=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^host\s*=.*/host = $REDIS_HOST/" "$file"
  else
    sed -i "/^\[redis\]/a host = $REDIS_HOST" "$file"
  fi

  if grep -qE "^port\s*=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^port\s*=.*/port = $REDIS_PORT/" "$file"
  else
    sed -i "/^\[redis\]/a port = $REDIS_PORT" "$file"
  fi

  if grep -qE "^password\s*=" "$file"; then
    sed -i "/^\[redis\]/,/^\[/ s/^password\s*=.*/password = $REDIS_PASSWORD/" "$file"
  else
    sed -i "/^\[redis\]/a password = $REDIS_PASSWORD" "$file"
  fi
}

# --- ClamAV handler (clamd.ini) ---
set_clamd_config() {
  local file=$1
  echo "[DITMail] Patching $file (clamd.ini style)..."

  if ! grep -q "^\[clamd\]" "$file"; then
    echo -e "\n[clamd]" >> "$file"
  fi

  if grep -qE "^host\s*=" "$file"; then
    sed -i "/^\[clamd\]/,/^\[/ s/^host\s*=.*/host = $CLAMAV_HOST/" "$file"
  else
    sed -i "/^\[clamd\]/a host = $CLAMAV_HOST" "$file"
  fi

  if grep -qE "^port\s*=" "$file"; then
    sed -i "/^\[clamd\]/,/^\[/ s/^port\s*=.*/port = $CLAMAV_PORT/" "$file"
  else
    sed -i "/^\[clamd\]/a port = $CLAMAV_PORT" "$file"
  fi
}

# --- Apply Configurations ---
for config_file in redis.ini karma.ini stats.redis.ini queue.redis.mongo.ini; do
  if [ -f "$CONFIG_DIR/$config_file" ]; then
    if [ "$config_file" == "redis.ini" ]; then
      set_main_redis_config "$CONFIG_DIR/$config_file"
    else
      set_plugin_redis_config "$CONFIG_DIR/$config_file"
    fi
  fi
done

# Apply ClamAV config
if [ -f "$CONFIG_DIR/clamd.ini" ]; then
  set_clamd_config "$CONFIG_DIR/clamd.ini"
fi

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
