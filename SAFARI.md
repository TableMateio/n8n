# N8N Safari Compatibility Guide

## Overview

This guide addresses known issues when running n8n with Safari browser on macOS. We've simplified the process by integrating Safari-specific settings into our main runner script.

## Safari HTTPS Mode

The simplest way to run n8n with Safari compatibility is:

```bash
# Run n8n with Safari HTTPS support
pnpm safari
```

This command:
- Sets up HTTPS with self-signed certificates
- Configures secure cookies properly for Safari
- Runs n8n in development mode with test data
- Opens the correct URL in your browser

## Alternative Methods

If you prefer other approaches, we still maintain these options:

```bash
# Use the standard interactive runner and select "safari" option
pnpm n8n

# Use the direct shell script for HTTPS
pnpm safari:https
```

## How It Works

The Safari mode automatically:

1. Checks for SSL certificates, generating them if needed
2. Adds the certificate to your system keychain (requires password)
3. Configures n8n with HTTPS and secure cookies enabled
4. Starts n8n in development mode with test environment
5. Opens the correct HTTPS URL in your browser

## Accessing N8N

- Safari HTTPS mode: `https://localhost:5678`

## Troubleshooting

### Certificate Warnings

When accessing n8n over HTTPS for the first time, you may see security warnings:

1. Click "Show Details"
2. Click "Visit Website"
3. Confirm "Visit Website" again
4. Enter your macOS password to trust the certificate

This only needs to be done once.

### Safari Security Settings

If you're still having issues:

1. In Safari, go to Preferences > Privacy & Security > Manage Website Data
2. Search for "localhost" and remove any entries
3. Go to Preferences > Advanced and enable "Show Develop menu in menu bar"
4. From the Develop menu, select "Disable Cross-Origin Restrictions" while testing
5. Restart Safari

## Technical Details

The Safari mode sets these environment variables:
- `N8N_PROTOCOL=https`
- `N8N_SECURE_COOKIE=true`
- `N8N_PORT=5678`
- `N8N_ENVIRONMENT=test`
- `NODE_ENV=development`
- `N8N_SSL_KEY=/path/to/localhost.key`
- `N8N_SSL_CERT=/path/to/localhost.crt`

All SSL certificate management is handled automatically.
