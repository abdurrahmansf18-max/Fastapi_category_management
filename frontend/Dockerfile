FROM node:22.19.0-alpine AS base

WORKDIR /app

# Install Alpine security updates published after the base image build.
RUN apk upgrade --no-cache

FROM base AS deps

COPY package*.json ./
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_BACKEND_ORIGIN=http://localhost:8000
ENV NEXT_BACKEND_ORIGIN=$NEXT_BACKEND_ORIGIN

RUN npm run build

FROM node:22.19.0-alpine AS runner

WORKDIR /app

RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /tmp/* \
      /root/.npm

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

CMD ["node", "server.js"]
