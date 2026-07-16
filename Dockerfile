# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Cache dependencies
COPY package*.json ./
RUN npm install

# Copy all repository source components
COPY . .

# Stage 2: Secure Production Runtime
FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built dependency layer modules
COPY --from=builder /usr/src/app/node_modules ./node_modules

# COPY ALL source files instead of just a single file to prevent missing component crashes
COPY --from=builder /usr/src/app/ ./

# Enforce secure non-root context execution
USER node

EXPOSE 3000

CMD ["node", "app.js"]
