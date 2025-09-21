#!/bin/bash

# Docker run script for MedMe Schedule Service

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting MedMe Schedule Service...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}⚠️  .env file not found. Please create one from env.example${NC}"
    echo -e "${BLUE}💡 Run: cp env.example .env && edit .env${NC}"
    exit 1
fi

# Check if Docker image exists
if ! docker images medme-schedule:latest | grep -q medme-schedule; then
    echo -e "${YELLOW}⚠️  Docker image not found. Building it first...${NC}"
    ./scripts/docker-build.sh
fi

# Stop existing container if running
if docker ps | grep -q medme-schedule-app; then
    echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
    docker stop medme-schedule-app
    docker rm medme-schedule-app
fi

# Start with docker-compose
echo -e "${BLUE}🐳 Starting with docker-compose...${NC}"
docker-compose up -d

# Wait a moment for the service to start
echo -e "${BLUE}⏳ Waiting for service to start...${NC}"
sleep 5

# Check health
echo -e "${BLUE}🏥 Checking service health...${NC}"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Service is healthy and running!${NC}"
    echo -e "${BLUE}🌐 Service URL: http://localhost:3000${NC}"
    echo -e "${BLUE}🏥 Health check: http://localhost:3000/health${NC}"
    echo -e "${BLUE}📊 View logs: docker-compose logs -f medme-schedule${NC}"
else
    echo -e "${RED}❌ Service health check failed!${NC}"
    echo -e "${YELLOW}📊 Check logs: docker-compose logs medme-schedule${NC}"
    exit 1
fi
