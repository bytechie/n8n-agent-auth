#!/bin/bash

# ========================================
# n8n Agent Auth - Azure Container Apps Deployment Script
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-n8n-mcp-rg}"
LOCATION="${AZURE_LOCATION:-eastus}"
CONTAINER_APP_ENV="n8n-mcp-env"
CONTAINER_APP_NAME="n8n-mcp-gateway"
CONTAINER_REGISTRY="${AZURE_REGISTRY:-n8nmcpregistry}"

echo -e "${BLUE}🚀 Deploying n8n MCP Gateway to Azure Container Apps...${NC}"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found${NC}"
    echo "Install it from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check authentication
echo "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    az login
fi

# Get environment variables
echo ""
echo "Please enter your environment variables:"
echo -n "Descope Project ID: "
read -r DESCOPE_PROJECT_ID

echo -n "n8n Webhook URL: "
read -r N8N_WEBHOOK_URL

echo -n "n8n API Key: "
read -rs N8N_API_KEY
echo ""

# Create resource group
echo ""
echo "📦 Creating resource group..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

# Create Container Registry
echo "Creating Azure Container Registry..."
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_REGISTRY" \
    --sku Basic \
    --admin-enabled true \
    --output none

# Get ACR credentials
ACR_USER=$(az acr credential show --name "$CONTAINER_REGISTRY" --resource-group "$RESOURCE_GROUP" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$CONTAINER_REGISTRY" --resource-group "$RESOURCE_GROUP" --query "passwords[0].value" -o tsv)
ACR_LOGIN_SERVER="$CONTAINER_REGISTRY.azurecr.io"

# Login to ACR
echo "Logging in to Azure Container Registry..."
echo "$ACR_PASSWORD" | docker login "$ACR_LOGIN_SERVER" -u "$ACR_USER" --password-stdin

# Build and push image
echo ""
echo "🔨 Building Docker image..."
docker build -t "$ACR_LOGIN_SERVER/$CONTAINER_APP_NAME:latest" .

echo "Pushing image to Azure Container Registry..."
docker push "$ACR_LOGIN_SERVER/$CONTAINER_APP_NAME:latest"

# Create Container Apps environment
echo ""
echo "Creating Container Apps environment..."
az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

# Create/update Container App
echo "Creating Container App..."
az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "$ACR_LOGIN_SERVER/$CONTAINER_APP_NAME:latest" \
    --target-port 3000 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 10 \
    --cpu 0.5 \
    --memory 1Gi \
    --set-env-vars "DESCOPE_PROJECT_ID=$DESCOPE_PROJECT_ID" \
    --set-env-vars "N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL" \
    --set-env-vars "N8N_API_KEY=$N8N_API_KEY" \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "PORT=3000" \
    --output none

# Get the app URL
APP_URL=$(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    -o tsv)

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}🌐 Your MCP Gateway is live at:${NC}"
echo "   https://$APP_URL/api/mcp"
echo ""
echo "Add this to your Claude Desktop config:"
echo ""
cat << EOF
{
  "mcpServers": {
    "n8n-azure": {
      "url": "https://$APP_URL/api/mcp",
      "authentication": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
EOF
