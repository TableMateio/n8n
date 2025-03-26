# Railway Browserless Integration Guide

This guide provides comprehensive instructions for integrating the Railway-hosted Browserless service with n8n workflows.

## Overview

Browserless is now deployed on Railway with the following configuration:

- **Public URL**: `https://browserless-production-2a8f.up.railway.app`
- **Token**: `8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
- **Concurrent Sessions**: 10
- **Queue Size**: 10
- **Timeout**: 300000 (5 minutes)

## Setup Checklist

1. [x] Deploy Browserless to Railway (completed)
2. [ ] Configure n8n credentials for Railway Browserless
3. [ ] Test the Railway Browserless integration
4. [ ] Update existing workflows to use Railway Browserless

## Configuration Files

We've created several files to facilitate the integration:

1. **Credentials Setup Guide**: `docs/railway-browserless-setup.md`
2. **Railway Configuration**: `utils/browserless/railway-config.js`
3. **Node Factory**: `utils/browserless/node-factory.js`
4. **Example Implementation**: `examples/browserless-railway-example.js`
5. **Test Workflow**: `workflows/processes/foreclosures/testBrowserlessRailway.json`

## Setting Up Credentials

Follow these steps to set up the Railway Browserless credentials in n8n:

1. Go to **Settings** > **Credentials** > **Create New Credentials**
2. Select **Browserless API**
3. Enter the following information:
   - **Name**: `Railway Browserless`
   - **API URL**: `https://browserless-production-2a8f.up.railway.app`
   - **Access Token**: `8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
4. Click **Create** to save the credentials

## Testing the Integration

1. We've created a test workflow at `workflows/processes/foreclosures/testBrowserlessRailway.json`
2. You can push it to n8n using the CLI tool:
   ```bash
   node utils/cli/n8n-cli.js push-json workflows/processes/foreclosures/testBrowserlessRailway.json
   ```
3. Execute the workflow in n8n to verify the connection works

## Using the Node Factory

The Node Factory simplifies creating Browserless nodes for your workflows:

```javascript
const BrowserlessNodeFactory = require('../utils/browserless/node-factory');

// Create a factory for Railway Browserless
const factory = new BrowserlessNodeFactory(true);

// Create different types of nodes
const contentNode = factory.createContentNode({
  url: '={{ $json.url }}',
  position: [740, 120],
  name: 'Get Content'
});

const executeNode = factory.createExecuteNode({
  code: yourCustomCode,
  position: [960, 120]
});

const screenshotNode = factory.createScreenshotNode({
  url: '={{ $json.url }}',
  position: [740, 280]
});
```

See `examples/browserless-railway-example.js` for a complete workflow example.

## Configuration Options

The Railway Browserless service has these configuration options:

- **Default User Agent**: Chrome-based user agent for requests
- **Default Wait Until**: `networkidle2` for page loading
- **Default Timeout**: 30 seconds for operations, 5 minutes overall
- **Token Authentication**: Always included in requests

You can customize these in the `utils/browserless/railway-config.js` file.

## Private vs Public Endpoints

If your n8n instance is deployed on Railway, you can use the internal endpoints for faster and more secure connections:

- **Public URL**: `https://browserless-production-2a8f.up.railway.app`
- **Internal URL**: `http://browserless.railway.internal:3001`

Use the `getBrowserConfig(true)` function in the Railway config to get internal endpoints.

## Persistent Sessions

To keep a browser session open across multiple nodes:

1. Use the `pauseOnConnect` parameter in your requests
2. Save the session ID from the response
3. Pass the session ID to subsequent requests

Example script for persistent sessions is available via `factory.createPersistentSessionScript()`.

## Troubleshooting

If you encounter issues:

1. **Connection Problems**: Verify the Railway service is running
2. **Authentication Errors**: Check that the token is correctly included
3. **Timeout Errors**: Increase the timeout settings for complex operations
4. **Invalid Parameters**: Verify all parameters match the Browserless API requirements

## Additional Resources

- Railway Dashboard: https://railway.app/dashboard
- Browserless Documentation: https://docs.browserless.io/
- n8n-nodes-browserless on npm: https://www.npmjs.com/package/n8n-nodes-browserless
