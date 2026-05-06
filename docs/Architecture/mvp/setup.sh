#!/bin/bash
# AI Sales System - Easy Installer

set -e

echo "📦 Checking environment dependencies..."

if ! command -v docker &>/dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "❌ Error: Docker Compose V2 is required."
    exit 1
fi

echo "🔧 Configuring environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "⚠️  Warning: .env.example not found. Creating a blank .env"
        touch .env
    fi
    
    # Generate secure random keys automatically for the buyer
    APP_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    
    # Safely append or replace secrets
    sed -i.bak "s/^APP_SECRET=.*/APP_SECRET=$APP_SECRET/" .env || echo "APP_SECRET=$APP_SECRET" >> .env
    sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env || echo "POSTGRES_PASSWORD=$DB_PASSWORD" >> .env
    echo "🔐 Generated secure application secrets."
fi

read -p "🤖 Enter your OpenAI API Key (leave blank to configure later): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    sed -i.bak "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" .env || echo "OPENAI_API_KEY=$OPENAI_KEY" >> .env
fi

echo "📂 Propagating environment to sub-services..."
# Ensure sub-services get the credentials since docker-compose.yml points to these specific paths
cp .env services/fastapi_quote_api/.env
cp .env apps/storefront-dubai_garments/.env

echo "🚀 Starting the system..."
docker compose up -d --build

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🏗️  Running database migrations..."
# Assuming your backend service is named 'api' or similar
docker compose exec -T storefront-dubai_garments npm run db:migrate || true

echo "------------------------------------------------"
echo "✅ SETUP COMPLETE!"
echo "🌐 Admin Panel: http://localhost:3000/admin"
echo "🛒 Storefront:  http://localhost:3000"
echo "------------------------------------------------"
echo "Next steps:"
echo "1. Log in with the default admin credentials"
echo "2. Go to Settings > AI Configuration to tune your prompts"
echo ""
echo "For support, refer to the /docs folder."