# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependency files first to utilize build caching layers
COPY package*.json ./
RUN npm install

# Copy all repository source components
COPY . .

# Stage 2: Hardened Secure Runtime
FROM node:20-alpine
WORKDIR /usr/src/app

# Set production execution configurations
ENV NODE_ENV=production

# Copy modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# CRITICAL SECURITY FIX: Copy source files and explicitly change ownership to the non-root 'node' user
COPY --from=builder --chown=node:node /usr/src/app/ ./

# Drop root process capability safely
USER node

# Expose app service port
EXPOSE 3000

CMD ["node", "app.js"]
