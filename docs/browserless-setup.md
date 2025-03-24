# Using Browserless with n8n for Browser Automation

This document explains how to set up and use the Browserless integration with n8n for browser automation tasks, particularly for property lookups.

## What is Browserless?

Browserless is a headless browser service that provides a simple API for browser automation. It allows you to:

1. Run Chrome in a Docker container
2. Access it via WebSocket or HTTP
3. Execute scripts in the browser context
4. Capture screenshots, PDFs, and more

## Setting Up Browserless

### Local Development

For local development, you can run Browserless in a Docker container:

```bash
# Using Docker directly
docker run --rm -p 3000:3000 -e "TOKEN=6R0W53R135510" ghcr.io/browserless/chromium

# Using Docker Compose (recommended)
docker-compose -f docker-compose.browserless.yml up -d
```

### Production Deployment

For production, we recommend deploying Browserless to Railway:

1. Create a new project in Railway
2. Add a service using the `ghcr.io/browserless/chromium` image
3. Set the following environment variables:
   - `TOKEN=your_secret_token` (use a strong token)
   - `MAX_CONCURRENT_SESSIONS=10`
   - `CONNECTION_TIMEOUT=60000`
   - `ENABLE_CORS=true`
   - `PREBOOT_CHROME=true`

## Installing the n8n-nodes-browserless Package

To use Browserless with n8n, you need to install the `n8n-nodes-browserless` package:

```bash
cd /path/to/n8n
npm install n8n-nodes-browserless
```

## Setting Up Credentials in n8n

1. Go to Settings > Credentials > Create New Credentials
2. Select "Browserless API"
3. Enter the following:
   - For local development: `http://localhost:3000`
   - For production: `https://your-railway-app-url.railway.app`
   - Token: Your browserless token
4. Save the credentials

## Using Browserless in Workflows

The Browserless node provides several operations:

1. **Content**: Get HTML content from a URL
2. **PDF**: Generate a PDF from a URL
3. **Screenshot**: Take a screenshot of a URL
4. **Scrape**: Extract data from a URL using a JSON schema
5. **Execute**: Run custom JavaScript in the browser context

### Example: Browser Automation Workflow

Our workflow follows this pattern:

1. Configure Browserless connection
2. Fetch records from Airtable
3. Process each record individually
4. Use Browserless to scrape property information
5. Update the records in Airtable

### Key Benefits Over Puppeteer

1. **Stable**: Runs in a dedicated container, avoiding dependency issues
2. **Scalable**: Can handle multiple concurrent sessions
3. **Visual Debug**: Provides debug view option
4. **Stealth Mode**: Better anti-bot capabilities
5. **Simpler Code**: Cleaner JavaScript for automation

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure the Browserless container is running and ports are properly mapped
2. **Authentication Failed**: Check that the token is correct
3. **Timeout**: Increase timeout values for complex operations
4. **Resource Limits**: Monitor CPU and memory usage of the container

### Debug Tools

1. **Live View**: Access `http://localhost:3000/` for the Browserless dashboard
2. **Logs**: Check the container logs with `docker logs browserless`
3. **Screenshots**: Take screenshots during execution to diagnose issues

## References

- [Browserless Documentation](https://docs.browserless.io/)
- [n8n-nodes-browserless on npm](https://www.npmjs.com/package/n8n-nodes-browserless)
- [n8n Documentation](https://docs.n8n.io/)
