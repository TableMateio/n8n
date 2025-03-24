# Puppeteer Docker Setup for n8n

This guide explains how to set up and use Docker with Puppeteer for browser automation in n8n workflows.

## Prerequisites

1. Install Docker Desktop for Mac:
   - Download from: https://www.docker.com/products/docker-desktop/
   - Drag to Applications folder and open
   - Wait for Docker to start (you'll see the Docker icon in your menu bar)

## Setting Up the Browser Container

### Option 1: Using Docker Compose (Recommended)

1. Run the browser container using Docker Compose:
   ```bash
   docker-compose -f docker-compose.puppeteer.yml up -d
   ```

2. To stop the container:
   ```bash
   docker-compose -f docker-compose.puppeteer.yml down
   ```

### Option 2: Using Docker Run Command

1. Run the browser container directly:
   ```bash
   docker run -p 3000:3000 browserless/chrome:latest
   ```

## Configuring n8n Workflows

To use the Docker browser container in n8n workflows:

1. Set the `browserWSEndpoint` in your workflow configuration:
   ```
   ws://localhost:3000
   ```

2. If you set a token in the docker-compose file, use:
   ```
   ws://localhost:3000?token=optional_security_token_if_needed
   ```

3. In Puppeteer nodes, make sure to use the `browserWSEndpoint` option.

## Testing the Setup

1. Run the `TEST: Puppeteer Remote Browser` workflow to verify the connection.
2. If successful, you should see a screenshot from the example.com website.

## Using Multiple Browser Tabs

When processing multiple records, each Puppeteer node will open a new tab in the browser. The browser container will handle session management automatically.

## Troubleshooting

1. **Connection refused error**: Make sure the Docker container is running and that port 3000 is accessible.

2. **Browser page timeout**: Increase the timeout settings in the Puppeteer node.

3. **High resource usage**: Adjust the `MAX_CONCURRENT_SESSIONS` environment variable in the Docker Compose file.

## Best Practices

1. Close browser sessions when finished with them to free up resources.

2. Limit the number of concurrent browser sessions to prevent memory issues.

3. Consider using a token for security in production environments.

4. Pre-boot Chrome for better performance by setting `PREBOOT_CHROME=true`.

## Reference Documentation

- [Browserless Documentation](https://docs.browserless.io/)
- [Puppeteer Documentation](https://pptr.dev/)
- [n8n-nodes-puppeteer](https://github.com/drudge/n8n-nodes-puppeteer)
