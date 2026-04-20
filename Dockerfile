# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Copy frontend files to day1 directory (expected by backend)
RUN mkdir -p /app/day1 && cp -r /app/frontend/* /app/day1/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --omit=dev --no-optional

# Expose port (Railway sets PORT env var, defaults to 3000)
EXPOSE 3000 8080

# Set NODE_ENV for production
ENV NODE_ENV=production
ENV PORT=8080

# Start the application from the project root
WORKDIR /app
CMD ["node", "backend/server.js"]
