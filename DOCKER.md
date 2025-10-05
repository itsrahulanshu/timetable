# LPU Timetable - Docker Deployment

This guide explains how to deploy the LPU Timetable application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project directory:**
   ```bash
   cd "Lpu Timetable"
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t lpu-timetable .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name lpu-timetable \
     -p 3000:3000 \
     -v $(pwd)/src/data:/app/src/data \
     -e UMS_USERNAME=your_username \
     -e UMS_PASSWORD=your_password \
     lpu-timetable
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# UMS Credentials (Required)
UMS_USERNAME=your_student_id
UMS_PASSWORD=your_password

# OneSignal Configuration (Optional)
ONESIGNAL_APP_ID=your_app_id
ONESIGNAL_API_KEY=your_api_key

# Application Settings (Optional)
PORT=3000
AUTO_REFRESH_ENABLED=true
AUTO_REFRESH_INTERVAL=30
PWA_VERSION=1.2.0
```

## Data Persistence

The application stores cache and session data in the `src/data` directory. This directory is mounted as a volume to persist data between container restarts.

## Health Check

The container includes a health check that monitors the application status:
- **Endpoint:** `http://localhost:3000/api/health`
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Retries:** 3

## Production Deployment

### Using Docker Compose

1. **Update docker-compose.yml with production settings:**
   ```yaml
   environment:
     - NODE_ENV=production
     - AUTO_REFRESH_ENABLED=true
     - AUTO_REFRESH_INTERVAL=30
   ```

2. **Deploy:**
   ```bash
   docker-compose up -d
   ```

### Using Docker Swarm

1. **Initialize swarm:**
   ```bash
   docker swarm init
   ```

2. **Deploy stack:**
   ```bash
   docker stack deploy -c docker-compose.yml lpu-timetable
   ```

## Monitoring

### View container status:
```bash
docker ps
```

### View logs:
```bash
docker logs lpu-timetable
```

### Access application:
- **Web Interface:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health
- **API Timetable:** http://localhost:3000/api/timetable

## Troubleshooting

### Container won't start:
1. Check logs: `docker logs lpu-timetable`
2. Verify environment variables are set correctly
3. Ensure port 3000 is not in use

### Authentication issues:
1. Verify UMS credentials in `.env` file
2. Check if LPU UMS is accessible from your network
3. Review authentication logs

### Data not persisting:
1. Ensure volume mount is correct: `-v $(pwd)/src/data:/app/src/data`
2. Check directory permissions
3. Verify container has write access to mounted directory

## Security Notes

- The container runs as a non-root user (`nodejs`)
- Environment variables should be kept secure
- Use Docker secrets for sensitive data in production
- Regularly update the base image for security patches

## Updates

To update the application:

1. **Pull latest changes:**
   ```bash
   git pull
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Support

For issues related to Docker deployment, check:
- Container logs: `docker logs lpu-timetable`
- Application health: http://localhost:3000/api/health
- Docker documentation: https://docs.docker.com/
