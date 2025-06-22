#!/bin/bash

HOST=${REDIS_HOST:-127.0.0.1}
PORT=${REDIS_PORT:-6379}
LOG=${LOG_LEVEL:-info}


sed "/^host=/s/=.*/=${HOST}/" config/redis.ini > tmpfile && mv tmpfile config/redis.ini
sed "/^port=/s/=.*/=${PORT}/" config/redis.ini > tmpfile && mv tmpfile config/redis.ini

sed "/^level=/s/=.*/=${LOG}/" config/log.ini > tmpfile && mv tmpfile config/log.ini


/usr/bin/supervisord