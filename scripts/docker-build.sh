#!/bin/bash

# Docker build script for MedMe Schedule Service

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Building MedMe Schedule Docker Image...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}⚠️  .env file not found. Please create one from env.example${NC}"
    echo -e "${BLUE}💡 Run: cp env.example .env && edit .env${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${BLUE}📦 Building Docker image...${NC}"
docker build -t medme-schedule:latest .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo -e "${BLUE}📊 Image info:${NC}"
    docker images medme-schedule:latest
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Build complete! You can now run:${NC}"
echo -e "${BLUE}   docker-compose up -d${NC}"
echo -e "${BLUE}   OR${NC}"
echo -e "${BLUE}   docker run -p 3000:3000 --env-file .env medme-schedule:latest${NC}"
