#!/bin/sh
set -eu

# Env değişkenlerini template dosyasına işle
envsubst < /etc/alertmanager/alertmanager.yml.tpl > /tmp/alertmanager.yml

exec /bin/alertmanager \
    --config.file=/tmp/alertmanager.yml \
    --storage.path=/alertmanager \
    "$@"
