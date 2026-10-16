# Production Multi-Stage Dockerfile for Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm test

# Production Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src/engines ./src/engines

# Install tsx globally for production typescript server execution
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
