# Production Multi-Stage Dockerfile for Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm test

# Production Runtime Image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json .npmrc ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
# server.ts imports the pure engine / verification / generation modules and shared types
COPY --from=builder /app/src ./src

# Install tsx globally for production typescript server execution
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
