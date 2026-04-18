# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies (including backend via postinstall)
RUN npm install

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "start"]
