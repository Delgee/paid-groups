# Multi-stage build for production worker

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

RUN mkdir -p logs && chown -R nodejs:nodejs logs

USER nodejs

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
