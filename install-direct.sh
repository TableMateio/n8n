#!/bin/bash

# Set variables
NODE_NAME="n8n-nodes-helloworld"
N8N_CUSTOM_DIR="$HOME/.n8n/custom"
CURRENT_DIR="$(pwd)"
DIST_DIR="$CURRENT_DIR/dist"

echo "Installing $NODE_NAME to n8n custom directory..."

# Create the custom directory if it doesn't exist
mkdir -p "$N8N_CUSTOM_DIR"

# Create package.json if it doesn't exist
if [ ! -f "$N8N_CUSTOM_DIR/package.json" ]; then
  echo "Creating package.json in custom directory..."
  cat > "$N8N_CUSTOM_DIR/package.json" << EOF
{
  "name": "custom",
  "version": "1.0.0",
  "description": "n8n custom nodes",
  "main": "index.js",
  "private": true,
  "dependencies": {}
}
EOF
fi

# Create or update the target directory
NODE_DIR="$N8N_CUSTOM_DIR/nodes/$NODE_NAME"
mkdir -p "$NODE_DIR"

# Copy the dist directory contents
echo "Copying files to $NODE_DIR..."
cp -R "$DIST_DIR"/* "$NODE_DIR/"

# Create a simple index.js file that points to the custom node
echo "Creating index.js in custom directory..."
cat > "$N8N_CUSTOM_DIR/index.js" << EOF
module.exports = {
  nodes: [
    require('./nodes/$NODE_NAME/nodes/HelloWorld/HelloWorld.node.js')
  ],
  credentials: [
    require('./nodes/$NODE_NAME/credentials/HelloWorldApi.credentials.js')
  ]
};
EOF

echo "Custom node installation complete!"
echo "Restart n8n to use the custom node."

# Kill any running n8n instances
pkill -f "n8n" || true
echo "Any running n8n instances have been terminated."
echo "Start n8n with: cd .. && pnpm start"
