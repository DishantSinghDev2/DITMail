# ---- Stage 1: Build ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy source code and build the application
COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# The main entrypoint from your package.json
CMD [ "node", "dist/ws-server.js" ]