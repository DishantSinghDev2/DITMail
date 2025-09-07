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

# --- Special handler for redis.ini ---
set_main_redis_config() {
  local file=$1
  echo "[DITMail] Patching $file (main redis.ini style)..."

  # Update [server] host
  if grep -qE "^\s*host\s*=" "$file"; then
    sed -i "/^\[server\]/,/^\[/ s/^\s*host\s*=.*/host = $REDIS_HOST/" "$file"
  else
    sed -i "/^\[server\]/a host = $REDIS_HOST" "$file"
  fi

  # Update [server] port
  if grep -qE "^\s*port\s*=" "$file"; then
    sed -i "/^\[server\]/,/^\[/ s/^\s*port\s*=.*/port = $REDIS_PORT/" "$file"
  else
    sed -i "/^\[server\]/a port = $REDIS_PORT" "$file"
  fi

  # Ensure [opts] section exists
  if ! grep -q "^\[opts\]" "$file"; then
    echo -e "\n[opts]" >> "$file"
  fi

  # Update password under [opts]
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

# --- Apply Configurations ---
for config_file in redis.ini dnsbl.ini greylist.ini; do
  if [ -f "$CONFIG_DIR/$config_file" ]; then
    if [ "$config_file" == "redis.ini" ]; then
      set_main_redis_config "$CONFIG_DIR/$config_file"
    else
      set_plugin_redis_config "$CONFIG_DIR/$config_file"
    fi
  fi
done

# Update log level
sed -i "s/^level\s*=.*/level = $LOG_LEVEL/" "$CONFIG_DIR/log.ini"

# --- Waiting... ---
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
