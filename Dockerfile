# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Leverage layer caching for dependencies by copying package files first
COPY package*.json ./
RUN npm install

# Copy the remaining application source files
COPY . .

# Stage 2: Minimal Secure Runtime
FROM node:20-alpine
WORKDIR /usr/src/app

# Enforce production environment optimization flags
ENV NODE_ENV=production

# Copy only production dependencies and source components from the builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/app.js ./

# Drop root capabilities: Run application processes as low-privilege node user
USER node

# Expose default application communication port
EXPOSE 3000

CMD ["node", "app.js"]
