#!/bin/bash

# Safari opener script for n8n
# Usage: ./open_safari.sh <url>

URL="$1"

if [ -z "$URL" ]; then
    echo "Usage: $0 <url>"
    exit 1
fi

echo "Opening URL in Safari: $URL"

# Try different methods to open Safari
if command -v open >/dev/null 2>&1; then
    # macOS method
    open -a Safari "$URL"
    echo "✅ Safari opened successfully"
else
    echo "❌ Could not open Safari"
    echo "Please manually open: $URL"
    exit 1
fi
