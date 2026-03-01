#!/bin/bash

# ========================================
# n8n Agent Auth - AWS App Runner Deployment Script
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REGION="${AWS_REGION:-us-east-1}"
APP_NAME="n8n-mcp-gateway"
ECR_REPO_NAME="$APP_NAME-repo"

echo -e "${BLUE}🚀 Deploying n8n MCP Gateway to AWS App Runner...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check authentication
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with AWS${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME"

# Login to ECR
echo ""
echo "🔐 Logging in to Amazon ECR..."
aws ecr get-login-password --region "$REGION" | \
    docker login --username AWS --password-stdin "$ECR_URI"

# Create ECR repository if it doesn't exist
echo ""
echo "📦 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$REGION" &> /dev/null || \
    aws ecr create-repository --repository-name "$ECR_REPO_NAME" --region "$REGION"

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
docker build -t "$APP_NAME:latest" .

# Tag for ECR
echo "Tagging image for ECR..."
docker tag "$APP_NAME:latest" "$ECR_URI:latest"

# Push to ECR
echo "Pushing image to ECR..."
docker push "$ECR_URI:latest"

# Create App Runner service
echo ""
echo "🚀 Creating App Runner service..."

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

# Create App Runner service (or update if exists)
cat > app-runner-config.json << EOF
{
  "ServiceName": "$APP_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "EnvironmentVariables": [
          {
            "Name": "DESCOPE_PROJECT_ID",
            "Value": "$DESCOPE_PROJECT_ID"
          },
          {
            "Name": "N8N_WEBHOOK_URL",
            "Value": "$N8N_WEBHOOK_URL"
          },
          {
            "Name": "N8N_API_KEY",
            "Value": "$N8N_API_KEY"
          },
          {
            "Name": "NODE_ENV",
            "Value": "production"
          },
          {
            "Name": "PORT",
            "Value": "3000"
          }
        ]
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/api/mcp?health=true"
  }
}
EOF

# Try to create service, update if exists
if aws apprunner describe-service --service-arn "$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn" --output text)" --region "$REGION" &> /dev/null; then
    echo "Updating existing App Runner service..."
    SERVICE_ARN=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn" --output text --region "$REGION")
    aws apprunner update-service \
        --service-arn "$SERVICE_ARN" \
        --source-configuration "$(cat app-runner-config.json | jq '.SourceConfiguration')" \
        --region "$REGION"
else
    echo "Creating new App Runner service..."
    aws apprunner create-service --cli-input-json file://app-runner-config.json --region "$REGION"
fi

# Get service URL
echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "Waiting for service to become active..."
aws apprunner wait service-running --service-arn "$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn" --output text --region "$REGION)" --region "$REGION"

SERVICE_URL=$(aws apprunner describe-service \
    --service-arn "$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn" --output text --region "$REGION)" \
    --region "$REGION" \
    --query "Service.ServiceUrl" \
    --output text)

echo ""
echo -e "${GREEN}🌐 Your MCP Gateway is live at:${NC}"
echo "   https://$SERVICE_URL/api/mcp"
echo ""

# Clean up
rm -f app-runner-config.json
