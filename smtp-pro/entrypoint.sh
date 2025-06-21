#!/bin/bash

HOST=${REDIS_HOST:-127.0.0.1}
PORT=${REDIS_PORT:-6379}
LOG=${LOG_LEVEL:-info}
ALTINBOX_MOD=${ALTINBOX_MOD:-1}

sed "/^stats_redis_host=/s/=.*/=${HOST}:${PORT}/" config/dnsbl.ini > tmpfile && mv tmpfile config/dnsbl.ini

sed "/^host=/s/=.*/=${HOST}/" config/greylist.ini > tmpfile && mv tmpfile config/greylist.ini
sed "/^port=/s/=.*/=${PORT}/" config/greylist.ini > tmpfile && mv tmpfile config/greylist.ini

sed "/^host=/s/=.*/=${HOST}/" config/redis.ini > tmpfile && mv tmpfile config/redis.ini
sed "/^port=/s/=.*/=${PORT}/" config/redis.ini > tmpfile && mv tmpfile config/redis.ini

sed "/^level=/s/=.*/=${LOG}/" config/log.ini > tmpfile && mv tmpfile config/log.ini

sed "/^altinbox=/s/=.*/=${ALTINBOX_MOD}/" config/altinbox.ini > tmpfile && mv tmpfile config/altinbox.ini

/usr/bin/supervisord