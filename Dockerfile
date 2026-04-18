# THE 42 POST - Dockerfile for Railway Deployment
FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Install backend dependencies directly
WORKDIR /app/backend
RUN npm install --omit=dev --no-optional

# Expose port
EXPOSE 3000

# Set NODE_ENV for production
ENV NODE_ENV=production

# Use ENTRYPOINT to directly execute node - no shell intermediary
ENTRYPOINT ["node"]
CMD ["server.js"]
