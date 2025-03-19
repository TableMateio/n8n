# SSL Certificate Security Guide for N8N

## Overview

This document explains how to handle SSL certificate issues, including:
- What to do if certificates are accidentally leaked
- How to regenerate secure certificates
- How to properly configure n8n to use the new certificates
- How to troubleshoot common SSL-related connection problems

## Secure Certificate Storage

SSL certificates for n8n should be stored in the `secure-certs` directory, which is excluded from Git by our `.gitignore` configuration.

```
/Users/scottbergman/Dropbox/TaxSurplus/Technology/n8n/secure-certs/localhost.key
/Users/scottbergman/Dropbox/TaxSurplus/Technology/n8n/secure-certs/localhost.crt
```

**NEVER** store certificates in the project root or any directory that is not explicitly excluded from Git.

## Handling Leaked Certificates

If you discover that SSL certificates have been accidentally committed to Git or otherwise leaked:

1. **Immediately revoke the compromised certificates** if they were issued by a CA
2. **Remove the certificates from Git history** using commands like `git filter-branch` or BFG Repo Cleaner
3. **Generate new certificates** following the procedure below
4. **Update all configurations** to point to the new certificates
5. **Notify relevant security teams** if this occurred in a production environment

## Generating New Certificates

To generate new self-signed certificates for development:

```bash
# Create the secure-certs directory if it doesn't exist
mkdir -p /path/to/n8n/secure-certs

# Generate a new self-signed certificate valid for 10 years
cd /path/to/n8n
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout secure-certs/localhost.key -out secure-certs/localhost.crt \
  -subj "/CN=localhost" \
  -extensions v3_ca -config <(echo -e "[req]\ndistinguished_name=req\n[req]\n[v3_ca]\nsubjectAltName=DNS:localhost\nbasicConstraints=critical,CA:true\n")

# Add the certificate to your system's trusted certificates
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain secure-certs/localhost.crt
```

## Configuring N8N with New Certificates

The n8n configuration uses two key files to set up SSL certificates:

1. **`.env` file** - Contains environment variables for n8n
2. **`scripts/run.js`** - Manages the startup process and certificate paths

### Update the .env file

Ensure your `.env` file points to the correct certificate paths:

```
N8N_PROTOCOL=https
N8N_SSL_KEY=/path/to/n8n/secure-certs/localhost.key
N8N_SSL_CERT=/path/to/n8n/secure-certs/localhost.crt
N8N_HOST=localhost
N8N_PORT=5678
N8N_SECURE_COOKIE=true
```

### Verify scripts/run.js Configuration

The `scripts/run.js` file should be configured to look for certificates in the `secure-certs` directory:

```javascript
// Certificate paths
const sslKey = path.join(projectRoot, 'secure-certs', 'localhost.key');
const sslCert = path.join(projectRoot, 'secure-certs', 'localhost.crt');
```

If these paths are different, update the script to use the correct paths.

## Troubleshooting SSL Connection Issues

### "Cannot establish a secure connection" Error

If your browser shows an error about not being able to establish a secure connection:

1. **Verify the certificates exist** in the expected location:
   ```bash
   ls -la /path/to/n8n/secure-certs/
   ```

2. **Check certificate permissions**:
   ```bash
   # Key should be readable only by the owner
   chmod 600 secure-certs/localhost.key
   # Certificate can be readable by all
   chmod 644 secure-certs/localhost.crt
   ```

3. **Verify certificate is trusted** by your system:
   ```bash
   # For macOS
   security find-certificate -a -c "localhost" /Library/Keychains/System.keychain
   ```

4. **Check n8n logs** for any certificate-related errors:
   ```bash
   # Look for SSL or certificate errors in logs
   grep -E "(SSL|certificate|key|secure)" ~/.n8n/logs/*
   ```

5. **Manually add the certificate to your keychain**:
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/n8n/secure-certs/localhost.crt
   ```

### Browser-Specific Issues

#### Safari

Safari has stricter security requirements. If you encounter issues:

1. Clear Safari's cache and website data for localhost
2. Go to Safari > Settings > Privacy > Manage Website Data
3. Search for "localhost" and remove all entries
4. Restart Safari and try accessing n8n again

#### Chrome

Chrome might cache previous certificate errors. Try:

1. Open Chrome's Developer Tools (F12)
2. Right-click the refresh button and select "Empty Cache and Hard Reload"
3. Or use "chrome://net-internals/#sockets" to flush the socket pools

### Connection Refused Errors

If you see "Connection Refused" errors:

1. **Verify n8n is running** and listening on the expected port:
   ```bash
   lsof -i :5678
   ```

2. **Check if n8n is configured to use HTTPS**:
   ```bash
   # Look for N8N_PROTOCOL in environment variables
   ps eww -p $(pgrep -f 'n8n') | grep N8N_PROTOCOL
   ```

3. **Make sure you're using the correct protocol** in your browser (https:// vs http://)

## Security Best Practices

1. **Never commit SSL certificates to Git**
2. **Keep private keys secure** and limit access to them
3. **Use the `secure-certs` directory** for all certificate files
4. **Regularly check for leaked secrets** using tools like GitGuardian
5. **Set up proper `.gitignore` rules** to prevent accidental commits:
   ```
   # SSL/TLS Certificates and Keys
   *.key
   *.pem
   *.crt
   certificates/
   secure-certs/
   ```

## What We Learned

During our troubleshooting, we discovered several important lessons:

1. SSL certificates should be stored in a dedicated, gitignored directory
2. The n8n configuration must use consistent paths for certificates
3. Certificates need to be trusted by the system for browsers to accept them
4. The environment variables in `.env` must align with the actual certificate locations
5. Safari has stricter security requirements than other browsers

By following the guidance in this document, you can:
- Properly secure your SSL certificates
- Recover quickly from accidental certificate exposure
- Troubleshoot and resolve common SSL connection issues
- Maintain a secure development environment for n8n
