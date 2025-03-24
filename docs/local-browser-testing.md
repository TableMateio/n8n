# Local Browser Testing with Docker and VNC

This guide explains how to set up a local environment for testing and debugging browser automation workflows with visible browsers using Docker and VNC.

## Setup Instructions

### 1. Start the Docker Container

Run the following command to start a Chromium container with VNC support:

```bash
docker run -d -p 3000:3000 -p 5900:5900 --name chrome-debug seleniarm/standalone-chromium:latest
```

This will:
- Start a container named `chrome-debug`
- Map port 3000 for WebSocket connections
- Map port 5900 for VNC connections

### 2. Connect to the VNC Server

You can view the browser visually by connecting to the VNC server:

#### macOS Built-in VNC Viewer:
1. Open Finder
2. Press `Cmd+K` to open the "Connect to Server" dialog
3. Enter `vnc://localhost:5900`
4. Click "Connect"

#### Third-Party VNC Viewers:
- [VNC Viewer](https://www.realvnc.com/en/connect/download/viewer/) (Multi-platform)
- [TightVNC](https://www.tightvnc.com/) (Windows)
- [TigerVNC](https://tigervnc.org/) (Linux)

### 3. Run the Test Workflow

In n8n, run the "LOCAL TEST: Puppeteer Visible Browser" workflow to verify the connection works. This workflow:
- Connects to `ws://localhost:3000` (your local Docker container)
- Navigates to Ulster County's property search website
- Performs basic interactions in a deliberately slowed-down manner for visibility
- Takes screenshots of the results

## Switching Between Development and Production

- **Development (Local)**: Use the local Docker container with `ws://localhost:3000` endpoint
- **Production (Railway)**: Use Railway with `wss://browserless-production-2a8f.up.railway.app?token=...` endpoint

Simply change the `browserWSEndpoint` value in the "Config" node to switch between environments.

## Useful Docker Commands

```bash
# Start the container
docker start chrome-debug

# Stop the container
docker stop chrome-debug

# View container logs
docker logs chrome-debug

# Restart the container
docker restart chrome-debug

# Remove the container (when no longer needed)
docker rm chrome-debug
```

## Troubleshooting

### Browser Connection Issues

If the workflow can't connect to the browser:
1. Check if the container is running: `docker ps`
2. Verify port mappings: `docker port chrome-debug`
3. Check container logs: `docker logs chrome-debug`

### VNC Connection Issues

If you can't connect to the VNC server:
1. Verify the container is running: `docker ps`
2. Check that port 5900 is mapped correctly: `docker port chrome-debug`
3. Try connecting to `localhost:5900` or `127.0.0.1:5900`

### Browser Crashes or Freezes

If the browser crashes or freezes during test runs:
1. Increase memory allocated to Docker (in Docker Desktop settings)
2. Restart the container: `docker restart chrome-debug`
3. Use simpler automation steps with more `await slowDown()` calls
