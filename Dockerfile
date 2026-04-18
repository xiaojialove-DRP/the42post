# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Install backend dependencies first
WORKDIR /app/backend
RUN npm install

# Go back to root and install root deps (optional, minimal)
WORKDIR /app

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "start"]
