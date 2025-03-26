# Railway Browserless Setup Guide

This document explains how to set up credentials in n8n for the Railway Browserless deployment.

## Railway Deployment Information

- **Public URL**: `https://browserless-production-2a8f.up.railway.app`
- **WebSocket Endpoint**: `wss://browserless-production-2a8f.up.railway.app?token=8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
- **Playwright Endpoint**: `wss://browserless-production-2a8f.up.railway.app/chromium/playwright?token=8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
- **WebDriver Endpoint**: `https://browserless-production-2a8f.up.railway.app/webdriver`
- **Access Token**: `8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`

## Setting Up Credentials in n8n

1. Log in to your n8n instance
2. Go to **Settings** > **Credentials** > **Create New Credentials**
3. Select **Browserless API**
4. Enter the following information:
   - **Name**: `Railway Browserless`
   - **API URL**: `https://browserless-production-2a8f.up.railway.app`
   - **Access Token**: `8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
5. Click **Create** to save the credentials

## Test Workflow

A test workflow has been created at `workflows/processes/foreclosures/testBrowserlessRailway.json` to verify the Railway Browserless setup.

To deploy and test this workflow:

```bash
# Push the test workflow to n8n
node utils/cli/n8n-cli.js push-json workflows/processes/foreclosures/testBrowserlessRailway.json

# Execute the workflow
node utils/cli/n8n-cli.js execute "TEST: Browserless Railway"
```

## Configuration Parameters

The Railway Browserless instance has the following configuration:

- **Concurrent Sessions**: 10
- **Timeout**: 300000 (5 minutes)
- **CORS Enabled**: true
- **Queue Size**: 10

## Using in Workflows

When creating Browserless nodes in your workflows, select the "Railway Browserless" credentials. You can also explicitly set the token in the requestOptions:

```json
"requestOptions": {
  "token": "8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1"
}
```

## Private Network Access (Internal Services)

If your n8n instance is also deployed on Railway and needs to access Browserless via the internal network, use these endpoints:

- **Internal URL**: `http://browserless.railway.internal:3001`
- **Internal WebSocket**: `ws://browserless.railway.internal:3001?token=8laRXWn6OtaJL51zdKbrfbeERbrwWh41m6YhzSJRfkuiLmh1`
- **Internal Port**: 3001

## Troubleshooting

If you encounter issues:

1. Verify your credentials are set up correctly
2. Check that the token is correctly included in requests
3. Ensure the Railway instance is running (check Railway dashboard)
4. Review the timeout settings if operations are taking too long
5. For connection issues, try using the WebSocket endpoint directly
