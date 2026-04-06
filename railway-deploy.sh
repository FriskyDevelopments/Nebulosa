#!/bin/bash

# 🚂 Railway Auto-Deploy Script
echo "🚂 Setting up Railway deployment..."
echo "=================================="

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    exit 1
fi

echo "🔐 Logging into Railway..."
railway login

echo "📁 Linking project..."
railway link

echo "🔧 Setting environment variables..."

# Load from .env if exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Function to prompt for a variable if it is not set
prompt_var() {
    local var_name=$1
    local is_secret=$2
    local current_val="${!var_name}"

    if [ -z "$current_val" ]; then
        if [ "$is_secret" = "true" ]; then
            read -s -p "Enter $var_name: " user_input
            echo ""
        else
            read -p "Enter $var_name: " user_input
        fi
        export "$var_name"="$user_input"
    fi
}

prompt_var "BOT_TOKEN" "true"
prompt_var "AUTHORIZED_GROUP_ID" "false"

prompt_var "ZOOM_USER_CLIENT_ID" "true"
prompt_var "ZOOM_USER_CLIENT_SECRET" "true"
prompt_var "ZOOM_CLIENT_ID" "true"
prompt_var "ZOOM_CLIENT_SECRET" "true"
prompt_var "ZOOM_REDIRECT_URI" "false"
prompt_var "ZOOM_SECRET_TOKEN" "true"

# Provide fallback for ZOOM_REDIRECT_URI if still empty
if [ -z "$ZOOM_REDIRECT_URI" ]; then
    export ZOOM_REDIRECT_URI="https://pupfr.github.io/Nebulosa/zoom-callback.html"
fi

# Core bot configuration
railway variables set BOT_TOKEN="$BOT_TOKEN"
railway variables set AUTHORIZED_GROUP_ID="$AUTHORIZED_GROUP_ID"

# Zoom OAuth configuration
railway variables set ZOOM_USER_CLIENT_ID="$ZOOM_USER_CLIENT_ID"
railway variables set ZOOM_USER_CLIENT_SECRET="$ZOOM_USER_CLIENT_SECRET"
railway variables set ZOOM_CLIENT_ID="$ZOOM_CLIENT_ID"
railway variables set ZOOM_CLIENT_SECRET="$ZOOM_CLIENT_SECRET"
railway variables set ZOOM_REDIRECT_URI="$ZOOM_REDIRECT_URI"
railway variables set ZOOM_SECRET_TOKEN="$ZOOM_SECRET_TOKEN"

# Railway deployment configuration
railway variables set PORT="3000"
railway variables set NODE_ENV="production"
railway variables set RAILWAY_STATIC_URL="nebulosa-production.railway.app"

echo "✅ All environment variables set!"

echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Check your deployment:"
echo "• Logs: railway logs"
echo "• Status: railway status"  
echo "• Domain: railway domain"
echo ""
echo "🤖 Your bot should now be running without ETELEGRAM 404 errors!"
