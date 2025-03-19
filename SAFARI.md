# N8N Safari Compatibility Guide

## Overview

This guide addresses known issues when running n8n with Safari browser on macOS. We provide multiple ways to run n8n that are compatible with Safari, depending on your needs.

## Running Options

You can run n8n with Safari in several different ways:

### 1. HTTP Mode (No Secure Cookies)

This is the simplest approach but doesn't use HTTPS:

```bash
# Quick start with HTTP (no secure cookies)
pnpm safari:direct
```

### 2. HTTPS Mode (Secure Cookies)

This is the recommended approach for development and testing APIs:

```bash
# Run with HTTPS (enables secure cookies)
pnpm safari:https
```

The first time you run this, you'll be prompted to add the self-signed certificate to your system keychain.

### 3. Full Development Mode with HTTPS

For active development with hot reloading and secure connections:

```bash
# Run with HTTPS in full development mode
pnpm safari:https:dev
```

## Modes and Features Comparison

| Mode | Command | HTTPS | Secure Cookies | Hot Reloading | Test Environment | API Testing |
|------|---------|-------|----------------|---------------|-------------------|-------------|
| Direct HTTP | `safari:direct` | ❌ | ❌ | ❌ | ✅ | ✅ |
| HTTPS | `safari:https` | ✅ | ✅ | ❌ | ✅ | ✅ |
| HTTPS Dev | `safari:https:dev` | ✅ | ✅ | ✅ | ✅ | ✅ |

## Accessing N8N

- HTTP mode: `http://localhost:5678`
- HTTPS mode: `https://localhost:5678`

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

## Development Notes

Each script sets the following environment variables as needed:
- `N8N_PROTOCOL`: http or https
- `N8N_SECURE_COOKIE`: false or true
- `N8N_PORT`: 5678
- `N8N_ENVIRONMENT`: test
- `NODE_ENV`: development
- `N8N_SSL_KEY`/`N8N_SSL_CERT`: Certificate paths when using HTTPS
