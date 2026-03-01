#!/bin/bash

# ========================================
# n8n Agent Auth - Environment Setup Script
# ========================================

set -e

echo "🔧 Setting up n8n Agent Auth environment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create .env from .env.example
echo "📝 Creating .env file from template..."
cp .env.example .env

# Generate random secrets
echo ""
echo "🔐 Generating secure random values..."

# Generate N8N_API_KEY if not set
N8N_API_KEY=$(openssl rand -base64 32 2>/dev/null || echo "change-me-n8n-api-key-$(date +%s)")
echo "N8N_API_KEY=$N8N_API_KEY"

# Generate a random password for n8n
N8N_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "change-me-n8n-password-$(date +%s)")
echo "N8N_PASSWORD=$N8N_PASSWORD"

# Update .env with generated values
sed -i.bak "s/your_n8n_api_key_here/$N8N_API_KEY/" .env
sed -i.bak "s/your_n8n_password_here/$N8N_PASSWORD/" .env
rm -f .env.bak

echo ""
echo -e "${GREEN}✅ Environment file created successfully!${NC}"
echo ""
echo "⚠️  IMPORTANT: Please update the following values in .env:"
echo "   - DESCOPE_PROJECT_ID       (required)"
echo "   - DESCOPE_AGENT_ACCESS_KEY (required for Claude Desktop)"
echo "   - N8N_WEBHOOK_URL          (or use local default)"
echo ""
echo "📖 See README.md for detailed setup instructions."
