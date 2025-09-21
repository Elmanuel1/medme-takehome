# Use Node.js 18 Alpine as base image for smaller size
FROM node:18

# Set working directory
WORKDIR /app

# Install dependencies for native modules (if needed)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy pre-built output
COPY dist ./dist

# Remove dev dependencies after copying
RUN npm prune --production

# Create non-root user for security
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs medme

# Change ownership of the app directory
RUN chown -R medme:nodejs /app
USER medme

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]