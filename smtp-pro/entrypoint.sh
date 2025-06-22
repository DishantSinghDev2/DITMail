#!/bin/bash

HOST=${REDIS_HOST:-127.0.0.1}
PORT=${REDIS_PORT:-6379}
LOG=${LOG_LEVEL:-info}


sed "/^host=/s/=.*/=${HOST}/" src/config/redis.ini > tmpfile && mv tmpfile src/config/redis.ini
sed "/^port=/s/=.*/=${PORT}/" src/config/redis.ini > tmpfile && mv tmpfile src/config/redis.ini

sed "/^level=/s/=.*/=${LOG}/" src/config/log.ini > tmpfile && mv tmpfile src/config/log.ini


/usr/bin/supervisord