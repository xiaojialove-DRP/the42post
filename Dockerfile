# THE 42 POST - Dockerfile for Railway Deployment

# Build stage
FROM node:18-alpine

WORKDIR /app

# Copy root package.json
COPY package*.json ./

# Copy backend directory
COPY backend ./backend

# Install root dependencies (this will trigger postinstall)
RUN npm install --production

# Set working directory to backend
WORKDIR /app/backend

# Expose port (Railway will detect this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
