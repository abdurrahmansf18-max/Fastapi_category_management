#!/bin/sh
# Her sentinel instance bu scripti çalıştırır.
# Şablon config'i kendi volume'una kopyalar, böylece her sentinel
# kendi state dosyasına yazabilir — paylaşılan dosya yok.

set -e

TEMPLATE="/etc/redis/sentinel-template.conf"
RUNTIME="/data/sentinel.conf"

# İlk çalıştırmada (veya volume boşsa) şablonu kopyala
if [ ! -f "$RUNTIME" ]; then
    cp "$TEMPLATE" "$RUNTIME"
    echo "sentinel-entrypoint: copied template → $RUNTIME"
fi

exec redis-sentinel "$RUNTIME"
