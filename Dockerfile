# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
# Ensure data dir exists for local runs (mounted at runtime)
RUN mkdir -p /app/data
RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN adduser -D -u 10001 appuser
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser
ENV PORT=3000
ENV DATABASE_FILE=/app/data/database.db
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1
ENTRYPOINT ["node", "dist/server.js"]
