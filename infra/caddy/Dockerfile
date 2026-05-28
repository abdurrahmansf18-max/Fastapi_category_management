# golang:1.24-alpine kullanalım — GOTOOLCHAIN=auto ile gerekirse 1.25 indirir
FROM golang:1.24-alpine AS builder
ENV GOTOOLCHAIN=auto
RUN apk add --no-cache git
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
WORKDIR /build
RUN xcaddy build \
    --with github.com/corazawaf/coraza-caddy/v2 \
    --with github.com/hslatman/caddy-crowdsec-bouncer/http \
    --output /usr/local/bin/caddy

FROM caddy:2.9-alpine
COPY --from=builder /usr/local/bin/caddy /usr/bin/caddy
