FROM node:22.19.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_BACKEND_ORIGIN=http://localhost:8000
ENV NEXT_BACKEND_ORIGIN=$NEXT_BACKEND_ORIGIN

RUN npm run build && \
    cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public || true

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", ".next/standalone/server.js"]
