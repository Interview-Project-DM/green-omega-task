#!/bin/bash

# Deploy script for Fly.io
set -e

echo "🚀 Deploying to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: flyctl auth login"
    exit 1
fi

# Deploy the app
echo "📦 Deploying app..."
flyctl deploy

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://green-omega-api.fly.dev"
