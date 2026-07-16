# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Leverage layer caching for dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Stage 2: Minimal Secure Runtime
FROM node:20-alpine
WORKDIR /usr/src/app

# Set production environment flag
ENV NODE_ENV=production

# Copy only production dependencies and source components from builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/app.js ./

# Enforce Security: Drop root capabilities and run as low-privilege service account
USER node

EXPOSE 3000

CMD ["node", "app.js"]

