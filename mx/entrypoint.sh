#!/bin/bash
set -e

echo "[DITMail] Starting entrypoint..."

REDIS_URL="${REDIS_HOST:-127.0.0.1:6379}"
LOG="${LOG_LEVEL:-info}"
ALTINBOX_MOD="${ALTINBOX_MOD:-1}"
CONFIG_DIR="${CONFIG_DIR:-/DITMail/src/config}"

echo "[DITMail] Configuring Haraka with:"
echo "  Redis URL: $REDIS_URL
echo "  Log Level:  $LOG"
echo "  AltInbox:   $ALTINBOX_MOD"

# Helper function: update or append config values
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
    echo "[WARN] File $file not found for setting $key"
  fi
}

# Redis-based plugin configs
set_config_value "$CONFIG_DIR/dnsbl.ini"    "stats_redis_host" "$REDIS_URL"

# Logging level
set_config_value "$CONFIG_DIR/log.ini"      "level"            "$LOG"

# AltInbox mode
set_config_value "$CONFIG_DIR/altinbox.ini" "altinbox"         "$ALTINBOX_MOD"

# Wait for TLS certs if needed
echo "[DITMail] Waiting for TLS certs..."
for i in {1..30}; do
  if [[ -f "/config/tls_cert.pem" && -f "/config/tls_key.pem" ]]; then
    echo "[DITMail] TLS certs found."
    break
  fi
  echo "[DITMail] TLS certs not found, retrying ($i/30)..."
  sleep 2
done

echo "[DITMail] Launching Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
