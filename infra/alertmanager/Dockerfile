# alertmanager binary'sini resmi imajdan al
FROM prom/alertmanager:v0.27.0 AS alertmanager-bin

# Alpine üzerine taşı — apk ile gettext (envsubst) kurulabilir
FROM alpine:3.21
RUN apk add --no-cache gettext ca-certificates tzdata

COPY --from=alertmanager-bin /bin/alertmanager /bin/alertmanager

RUN addgroup -S alertmanager && adduser -S -G alertmanager alertmanager
RUN mkdir /alertmanager && chown alertmanager:alertmanager /alertmanager

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER alertmanager
VOLUME ["/alertmanager"]
ENTRYPOINT ["/entrypoint.sh"]
