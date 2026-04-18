# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json package*.json ./
COPY backend/package.json backend/package*.json ./backend/

# Install dependencies (skip postinstall script which runs during Docker build)
RUN npm install --omit=dev --ignore-scripts
RUN cd backend && npm install --omit=dev

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Set NODE_ENV for production
ENV NODE_ENV=production

# Start backend
CMD ["npm", "start"]
