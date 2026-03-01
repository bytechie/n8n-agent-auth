# n8n Agent Auth

Secure MCP (Model Context Protocol) Gateway for n8n workflows with Descope authentication.

## Overview

This project provides a production-ready architecture for exposing n8n workflows as MCP tools while securing them with Descope's authentication and authorization. AI agents like Claude can safely execute n8n automations without exposing your n8n instance directly to the internet.

### Architecture

```
┌─────────────────┐     Bearer Token      ┌──────────────────┐     X-N8N-API-KEY     ┌─────────┐
│  Claude Desktop │ ───────────────────►  │  MCP Gateway     │ ──────────────────► │   n8n   │
│   (AI Agent)    │                        │  (Next.js +       │                      │ Workflows│
└─────────────────┘                        │   Descope Auth)   │                      └─────────┘
                                          └──────────────────┘
```

## Features

- **Secure Authentication**: Descope token validation on every request
- **Role-Based Access Control**: Restrict tools by user roles
- **Audit Logging**: Track all agent actions via Descope
- **Multi-Platform Deployment**: Docker, Railway, AWS, Azure, GCP
- **Type-Safe**: Full TypeScript support
- **Health Monitoring**: Built-in health check endpoints

## Quick Start

### Prerequisites

- Docker and Docker Compose
- A Descope account (free tier available)
- An n8n instance (local or hosted)

### 1. Clone and Setup

```bash
# Navigate to project directory
cd n8n-agent-auth

# Run environment setup
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

### 2. Configure Descope

1. Sign up at [descope.com](https://www.descope.com)
2. Create a new project and note your **Project ID**
3. Navigate to **Manage > Access Keys**
4. Create a new Access Key for your AI agent
5. Update your `.env` file:
   ```bash
   DESCOPE_PROJECT_ID=your_project_id
   DESCOPE_AGENT_ACCESS_KEY=your_access_key
   ```

### 3. Configure n8n Workflow

1. Create a workflow in n8n with a **Webhook** node
2. Set HTTP Method to **POST**
3. Enable **Header Auth** with:
   - Header Name: `X-N8N-API-KEY`
   - Header Value: (use `N8N_API_KEY` from your `.env`)
4. Add a **Respond to Webhook** node to return results
5. Copy the webhook URL to your `.env`:
   ```bash
   N8N_WEBHOOK_URL=http://n8n:5678/webhook/your-workflow
   ```

### 4. Start Services

```bash
docker-compose up -d
```

Access:
- **Gateway**: http://localhost:3000
- **n8n**: http://localhost:5678

### 5. Configure Claude Desktop

Edit `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n8n-local": {
      "url": "http://localhost:3000/api/mcp",
      "authentication": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
```

Restart Claude Desktop and your n8n tools are available!

## Project Structure

```
n8n-agent-auth/
├── gateway/                    # Next.js MCP Gateway
│   ├── src/
│   │   ├── app/
│   │   │   └── api/mcp/[...transport]/route.ts  # MCP server endpoint
│   │   └── lib/
│   │       ├── descope.ts     # Descope authentication
│   │       ├── n8n.ts         # n8n webhook client
│   │       └── tools.ts       # MCP tool definitions
│   └── package.json
├── scripts/
│   ├── setup-env.sh           # Environment setup
│   ├── deploy-railway.sh      # Railway deployment
│   ├── deploy-aws.sh          # AWS App Runner deployment
│   └── deploy-azure.sh        # Azure Container Apps deployment
├── docker-compose.yml         # Local development
├── Dockerfile                 # Production image
├── .env.example               # Environment template
└── README.md
```

## Adding Custom Tools

Edit `gateway/src/lib/tools.ts` to add new tools:

```typescript
export const myCustomTool: Tool = {
  name: 'my_custom_tool',
  description: 'Does something cool',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    }
  },
};

export const toolHandlers: Record<string, ToolHandler> = {
  my_custom_tool: async (args) => {
    // Your logic here
    return {
      content: { result: 'success' },
      isSuccess: true,
    };
  },
};
```

## Role-Based Access Control

Restrict tools to specific roles in `route.ts`:

```typescript
const tools = availableTools.filter((tool) => {
  if (tool.name === 'dangerous_task') {
    return authInfo.roles.includes('Admin');
  }
  return true;
});
```

## Deployment

### Railway (Recommended)

```bash
chmod +x scripts/deploy-railway.sh
./scripts/deploy-railway.sh
```

### AWS App Runner

```bash
chmod +x scripts/deploy-aws.sh
./scripts/deploy-aws.sh
```

### Azure Container Apps

```bash
chmod +x scripts/deploy-azure.sh
./scripts/deploy-azure.sh
```

### Manual Docker Deployment

```bash
docker build -t n8n-mcp-gateway .
docker run -p 3000:3000 \
  -e DESCOPE_PROJECT_ID=xxx \
  -e N8N_WEBHOOK_URL=xxx \
  -e N8N_API_KEY=xxx \
  n8n-mcp-gateway
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DESCOPE_PROJECT_ID` | Yes | Your Descope project ID |
| `N8N_WEBHOOK_URL` | Yes | Full URL to your n8n webhook |
| `N8N_API_KEY` | Yes | Secret key for n8n auth |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (default: development) |

## Security Best Practices

1. **Never commit `.env`** - Use `.env.example` as template
2. **Rotate keys regularly** - Update Descope Access Keys periodically
3. **Use RBAC** - Restrict dangerous workflows to admin roles
4. **Monitor logs** - Check Descope audit trails for suspicious activity
5. **HTTPS only** - Always use TLS in production

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/mcp?health=true
```

### Descope Audit Logs

Navigate to **Audit and Troubleshoot** in your Descope console to see:
- All authentication attempts
- Token validation events
- Agent activity timestamps

## Troubleshooting

### "Unauthorized" errors

- Verify Descope Project ID is correct
- Check Access Key is valid and not expired
- Ensure Authorization header format: `Bearer <token>`

### n8n webhook failures

- Verify `N8N_WEBHOOK_URL` is accessible from the gateway
- Check `X-N8N-API-KEY` matches n8n webhook credentials
- Test webhook directly: `curl -X POST -H "X-N8N-API-KEY: xxx" <url>`

### Docker connection issues

```bash
# Check logs
docker-compose logs gateway
docker-compose logs n8n

# Restart services
docker-compose restart
```

## License

MIT

## Resources

- [Descope Documentation](https://docs.descope.com)
- [MCP Specification](https://modelcontextprotocol.io)
- [n8n Documentation](https://docs.n8n.io)
