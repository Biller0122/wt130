# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
