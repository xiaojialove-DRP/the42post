# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Make startup script executable
RUN chmod +x start.sh

# Install backend dependencies directly
WORKDIR /app/backend
RUN npm install --omit=dev --no-optional

# Go back to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Set NODE_ENV for production
ENV NODE_ENV=production

# Start backend via startup script
CMD ["/bin/bash", "start.sh"]
