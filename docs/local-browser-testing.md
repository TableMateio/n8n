# Local Browser Testing with Docker and noVNC

This guide explains how to set up a local environment for testing and debugging browser automation workflows with visible browsers using Docker and noVNC.

## Setup Instructions

### 1. Start the Docker Container

Run the following command to start a Chromium container with noVNC support:

```bash
docker run -d -p 4444:4444 -p 7900:7900 --name chrome-debug seleniarm/standalone-chromium:latest
```

This will:
- Start a container named `chrome-debug`
- Map port 4444 for Selenium WebDriver connections
- Map port 7900 for noVNC web access to view the browser

### 2. Access the Browser Visually

You can view the browser directly in your web browser:

1. Open your web browser
2. Navigate to http://127.0.0.1:7900/?autoconnect=1&resize=scale&password=secret
3. You should now see the Chromium browser running in the container

**Default password**: `secret`

### 3. Run the Test Workflow

In n8n, run the "LOCAL TEST: Puppeteer Visible Browser" workflow:
- This workflow will provide a direct link to the browser view
- Open the provided link to see the browser
- Any automated workflows that run against the Selenium server will be visible in this browser window

## Using Selenium WebDriver for Automation

This container exposes a standard Selenium WebDriver endpoint at:
```
http://127.0.0.1:4444/wd/hub
```

You can connect to this endpoint from various testing frameworks and tools.

## For n8n Workflows

When creating automation workflows in n8n:

1. Use the Selenium integration nodes instead of Puppeteer for visible automation
2. If using code nodes, consider using a WebDriver client library
3. Keep the browser view open while running workflows to see the automation in action

## Switching Between Development and Production

- **Development (Local)**: Use the local Selenium endpoint `http://127.0.0.1:4444/wd/hub`
- **Production (Railway)**: Use Railway with headless mode or Browserless endpoint

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

If you can't connect to the browser:
1. Check if the container is running: `docker ps`
2. Verify port mappings: `docker port chrome-debug`
3. Check container logs: `docker logs chrome-debug`

### noVNC Access Issues

If you can't access the noVNC interface:
1. Make sure port 7900 is available and not used by another application
2. Try using the password `secret` when prompted
3. **Important**: Use `127.0.0.1` instead of `localhost` in URLs (e.g., `http://127.0.0.1:7900`)

### Browser Crashes or Freezes

If the browser crashes or freezes during test runs:
1. Increase memory allocated to Docker (in Docker Desktop settings)
2. Restart the container: `docker restart chrome-debug`
3. Reduce automation complexity or slow down test steps
