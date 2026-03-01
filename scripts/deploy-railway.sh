#!/bin/bash

# ========================================
# n8n Agent Auth - Railway Deployment Script
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying n8n MCP Gateway to Railway...${NC}"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
echo "Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    railway login
fi

# Initialize Railway project if not exists
if [ ! -f railway.json ]; then
    echo "Initializing Railway project..."
    railway init
fi

# Set environment variables
echo ""
echo "🔧 Setting environment variables..."

echo -n "Enter your Descope Project ID: "
read -r DESCOPE_PROJECT_ID

echo -n "Enter your n8n Webhook URL: "
read -r N8N_WEBHOOK_URL

echo -n "Enter your n8n API Key (X-N8N-API-KEY): "
read -rs N8N_API_KEY
echo ""

# Set variables in Railway
railway variable set DESCOPE_PROJECT_ID="$DESCOPE_PROJECT_ID"
railway variable set N8N_WEBHOOK_URL="$N8N_WEBHOOK_URL"
railway variable set N8N_API_KEY="$N8N_API_KEY"
railway variable set NODE_ENV=production
railway variable set PORT=3000

# Deploy
echo ""
echo -e "${BLUE}📦 Deploying to Railway...${NC}"
railway up

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"

# Get the deployment URL
DOMAIN=$(railway domain | head -n 1)
if [ -n "$DOMAIN" ]; then
    echo ""
    echo -e "${GREEN}🌐 Your MCP Gateway is live at:${NC}"
    echo "   https://$DOMAIN/api/mcp"
    echo ""
    echo "Add this to your Claude Desktop config:"
    echo ""
    cat << EOF
{
  "mcpServers": {
    "n8n-railway": {
      "url": "https://$DOMAIN/api/mcp",
      "authentication": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
EOF
fi
