# N8N HTTPS Compatibility Guide

## Overview

This guide addresses secure HTTPS setup for n8n, which is especially important for Safari browser compatibility. We've made HTTPS the default configuration for the best security and cross-browser compatibility.

## Using HTTPS Mode

The simplest way to run n8n with HTTPS is:

```bash
# Run n8n with HTTPS support (default)
pnpm n8n
# or directly
pnpm https
```

This command:
- Sets up HTTPS with self-signed certificates
- Configures secure cookies properly
- Runs n8n in development mode with test data
- Opens the correct URL in your browser
- Works with all browsers including Safari

## Alternative Methods

If you prefer other approaches, we still maintain these options:

```bash
# Use the standard interactive runner (defaults to HTTPS)
pnpm n8n

# Backward compatibility for Safari users
pnpm safari

# HTTP-only mode (not recommended)
pnpm n8n:http
```

## How It Works

The HTTPS mode automatically:

1. Checks for SSL certificates, generating them if needed
2. Adds the certificate to your system keychain (requires password)
3. Configures n8n with HTTPS and secure cookies enabled
4. Starts n8n in development mode with test environment
5. Opens the correct HTTPS URL in your browser

## Accessing N8N

- HTTPS mode: `https://localhost:5678`

## Troubleshooting

### Certificate Warnings

When accessing n8n over HTTPS for the first time, you may see security warnings:

1. Click "Show Details"
2. Click "Visit Website"
3. Confirm "Visit Website" again
4. Enter your macOS password to trust the certificate

This only needs to be done once.

### Safari-Specific Issues

If you're using Safari and having issues:

1. In Safari, go to Preferences > Privacy & Security > Manage Website Data
2. Search for "localhost" and remove any entries
3. Go to Preferences > Advanced and enable "Show Develop menu in menu bar"
4. From the Develop menu, select "Disable Cross-Origin Restrictions" while testing
5. Restart Safari

## Why HTTPS is Important

Using HTTPS, even in development:

1. **Security**: Prevents traffic interception and data leakage
2. **Cookies**: Enables secure cookies that work across all browsers
3. **Modern APIs**: Many modern web APIs require secure contexts
4. **Browser Compatibility**: Ensures consistent behavior across all browsers
5. **Production Similarity**: Your development environment better matches production

## Technical Details

The HTTPS mode sets these environment variables:
- `N8N_PROTOCOL=https`
- `N8N_SECURE_COOKIE=true`
- `N8N_PORT=5678`
- `N8N_ENVIRONMENT=test`
- `NODE_ENV=development`
- `N8N_SSL_KEY=/path/to/localhost.key`
- `N8N_SSL_CERT=/path/to/localhost.crt`

All SSL certificate management is handled automatically.
