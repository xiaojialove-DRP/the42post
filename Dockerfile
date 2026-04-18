# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev

# Copy all files
COPY . .

# Install backend dependencies directly
WORKDIR /app/backend
RUN npm install --omit=dev --no-optional

# Go back to root
WORKDIR /app

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Expose port
EXPOSE 3000

# Set NODE_ENV for production
ENV NODE_ENV=production

# Start backend
CMD ["node", "backend/server.js"]
