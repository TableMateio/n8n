#!/bin/bash

echo "🚀 Setting up n8n with Docker..."

# Create the data directory
mkdir -p n8n_data

# Check if user wants to migrate existing data
if [ -f "database.sqlite" ]; then
    echo "📦 Found existing database.sqlite file."
    read -p "Do you want to copy your existing data to Docker? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📂 Copying existing database..."
        cp database.sqlite n8n_data/database.sqlite
        echo "✅ Database copied!"
    fi
fi

# Check for existing workflows directory
if [ -d "workflows" ]; then
    echo "📁 Found existing workflows directory."
    read -p "Do you want to copy your existing workflows to Docker? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📂 Copying existing workflows..."
        cp -r workflows n8n_data/
        echo "✅ Workflows copied!"
    fi
fi

# Set proper permissions
echo "🔧 Setting up permissions..."
chmod -R 777 n8n_data

echo "🐳 Starting n8n with Docker Compose..."
docker-compose up -d

echo ""
echo "🎉 n8n is starting up!"
echo "📍 You can access it at: http://localhost:5678"
echo ""
echo "⚡ Cron functions will work perfectly in this Docker setup!"
echo ""
echo "📋 Useful commands:"
echo "  • Stop n8n: docker-compose down"
echo "  • View logs: docker-compose logs -f n8n"
echo "  • Restart n8n: docker-compose restart"
echo "  • Update n8n: docker-compose pull && docker-compose up -d"
echo ""
echo "💡 Your data is stored in the 'n8n_data' directory and will persist between restarts."
