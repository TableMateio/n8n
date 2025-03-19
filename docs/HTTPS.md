# N8N HTTPS Compatibility Guide

## Overview

This guide explains how to run n8n with secure HTTPS in all environments. HTTPS is now enabled by default for all modes, providing better security and cross-browser compatibility, especially for Safari.

## Quick Start

The simplest way to run n8n with HTTPS is:

```bash
# Run n8n with interactive environment selection (all use HTTPS by default)
pnpm n8n
```

This will:
- Prompt you to select your preferred environment (development, test, production)
- Set up HTTPS with self-signed certificates automatically
- Configure secure cookies properly
- Open the correct URL in your browser
- Work with all browsers including Safari

## Environment Options

All environments now use HTTPS by default:

```bash
# Development mode with test data (recommended for most development)
pnpm n8n:dev-test
# or just
pnpm n8n dev-test

# Development mode with real/production data
pnpm n8n:dev
# or
pnpm n8n dev

# Test mode (stable server with test data)
pnpm n8n:test
# or
pnpm n8n test

# Production mode (stable server with real data)
pnpm n8n:prod
# or
pnpm n8n prod
```

## HTTP Mode (if needed)

If you need to use HTTP instead of HTTPS:

```bash
# Any environment with HTTP instead of HTTPS
pnpm n8n dev --http
pnpm n8n dev-test --http
pnpm n8n test --http
pnpm n8n prod --http

# Or using the shorthand command
pnpm http
# or
pnpm n8n:http
```

## Legacy Options

For backward compatibility:

```bash
# Legacy Safari-specific mode (same as dev-test with HTTPS)
pnpm safari

# HTTPS-explicit mode (same as dev-test with HTTPS)
pnpm https
```

## How It Works

All environments now automatically:

1. Check for SSL certificates, generating them if needed
2. Add the certificate to your system keychain (requires password)
3. Configure n8n with HTTPS and secure cookies enabled
4. Start n8n in your selected environment (dev, test, etc.)
5. Open the correct HTTPS URL in your browser

## Accessing N8N

- HTTPS mode: `https://localhost:5678`
- HTTP mode: `http://localhost:5678`

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

When HTTPS is enabled, these environment variables are automatically set:
- `N8N_PROTOCOL=https`
- `N8N_SECURE_COOKIE=true`
- `N8N_PORT=5678`
- `N8N_HOST=localhost`
- `N8N_EDITOR_BASE_URL=https://localhost:5678/`
- `N8N_SSL_KEY=/path/to/localhost.key`
- `N8N_SSL_CERT=/path/to/localhost.crt`

All SSL certificate management is handled automatically.
