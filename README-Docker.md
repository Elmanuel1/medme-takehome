# 🐳 MedMe Schedule - Docker Deployment

This guide covers how to deploy the MedMe Schedule service using Docker.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Environment variables configured

## 🚀 Quick Start

### 1. Configure Environment

```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file with your actual values
nano .env
```

### 2. Build and Run

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Build and start the service
./scripts/docker-run.sh
```

## 🔧 Manual Setup

### Build the Docker Image

```bash
# Build the image
docker build -t medme-schedule:latest .

# Or use the build script
./scripts/docker-build.sh
```

### Run with Docker Compose

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f medme-schedule

# Stop the service
docker-compose down
```

### Run with Docker CLI

```bash
# Run the container directly
docker run -d \
  --name medme-schedule-app \
  -p 3000:3000 \
  --env-file .env \
  medme-schedule:latest
```

## 🏥 Health Checks

The service includes health checks accessible at:

```bash
# Check if the service is running
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"2025-01-15T10:00:00.000Z"}
```

## 📊 Monitoring

### View Logs

```bash
# Docker Compose
docker-compose logs -f medme-schedule

# Docker CLI
docker logs -f medme-schedule-app
```

### Container Stats

```bash
# View resource usage
docker stats medme-schedule-app
```

## 🔒 Environment Variables

Required environment variables (see `env.example`):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_CALENDAR_PRIMARY_CALENDAR_ID` | Primary calendar ID |
| `RETELL_WEBHOOK_SIGNING_KEY` | Retell webhook signing key |

## 🚨 Troubleshooting

### Service Won't Start

1. Check logs:
   ```bash
   docker-compose logs medme-schedule
   ```

2. Verify environment variables:
   ```bash
   docker-compose config
   ```

3. Test health endpoint:
   ```bash
   curl -v http://localhost:3000/health
   ```

### Database Connection Issues

1. Verify Supabase credentials in `.env`
2. Check network connectivity
3. Ensure Supabase allows connections from your IP

### Build Failures

1. Clear Docker cache:
   ```bash
   docker system prune -a
   ```

2. Rebuild from scratch:
   ```bash
   docker-compose build --no-cache
   ```

## 📝 Production Deployment

### Security Considerations

1. **Use secrets management** instead of `.env` files
2. **Enable HTTPS** with a reverse proxy (nginx, Traefik)
3. **Restrict network access** to necessary ports only
4. **Regular security updates** for base images

### Scaling

```bash
# Scale to multiple instances
docker-compose up -d --scale medme-schedule=3
```

### With Reverse Proxy (nginx example)

```nginx
upstream medme-schedule {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://medme-schedule;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ Development

### Development Mode

```bash
# Run in development mode with hot reload
docker-compose -f docker-compose.dev.yml up
```

### Debug Mode

```bash
# Run with debugging enabled
docker run -p 3000:3000 -p 9229:9229 --env-file .env medme-schedule:latest npm run debug
```

## 📚 Additional Commands

```bash
# Remove all containers and images
docker-compose down --rmi all --volumes

# Update to latest image
docker-compose pull && docker-compose up -d

# Backup database (if using local PostgreSQL)
docker exec medme-postgres pg_dump -U medme medme_schedule > backup.sql
```
