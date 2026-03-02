# Quick Reference - n8n MCP Gateway

## Essential Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Gateway only
docker logs -f n8n-mcp-gateway

# n8n only
docker logs -f n8n-instance
```

### Rebuild Gateway
```bash
docker-compose up -d --build gateway
```

### Restart Services
```bash
# Restart gateway only
docker-compose restart gateway

# Restart n8n only
docker-compose restart n8n

# Restart all
docker-compose restart
```

---

## URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| n8n Editor | http://localhost:5678 | admin / password |
| Gateway Health | http://localhost:3000/api/mcp/sse?health=true | - |
| MCP Endpoint | http://localhost:3000/api/mcp/sse | Bearer token required |
| OAuth Metadata | http://localhost:3000/.well-known/oauth-protected-metadata | - |

---

## Testing Commands

### 1. Health Check
```bash
curl "http://localhost:3000/api/mcp/sse?health=true"
```

### 2. OAuth Metadata Discovery
```bash
curl "http://localhost:3000/.well-known/oauth-protected-metadata"
```

### 3. Test WWW-Authenticate Header
```bash
curl -v "http://localhost:3000/api/mcp/sse" 2>&1 | grep "www-authenticate"
```

### 4. Initialize MCP Connection
```bash
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "id": 1,
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    }
  }'
```

### 5. List MCP Tools
```bash
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### 6. Execute n8n Task
```bash
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "run_n8n_task",
      "arguments": {"data": {"test": "value"}}
    },
    "id": 1
  }'
```

### 7. Test n8n Webhook Directly
```bash
curl -X POST "http://localhost:5678/webhook/YOUR_PATH" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: YOUR_N8N_KEY" \
  -d '{"test": "data"}'
```

---

## Environment Variables (.env)

```bash
# Descope
DESCOPE_PROJECT_ID=your_descope_project_id
DESCOPE_AGENT_ACCESS_KEY=your_descope_access_key

# n8n
N8N_WEBHOOK_URL=http://n8n:5678/webhook/YOUR_PATH
N8N_API_KEY=your_n8n_api_key

# Gateway
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
GATEWAY_PUBLIC_URL=http://localhost:3000
```

---

## Directory Structure

```
n8n-agent-auth/
├── gateway/
│   └── src/
│       ├── app/
│       │   ├── .well-known/oauth-protected-metadata/route.ts  # OAuth discovery
│       │   └── api/mcp/[...transport]/route.ts                 # MCP endpoint
│       └── lib/
│           ├── descope.ts                                      # Legacy auth
│           ├── descope-oauth.ts                                # OAuth 2.1 auth
│           ├── mcp-server.ts                                   # MCP server instance
│           ├── n8n.ts                                          # Webhook client
│           └── tools.ts                                        # Tool definitions
├── docs/                                                       # Documentation
├── docker-compose.yml                                          # Local dev
├── Dockerfile                                                  # Production build
└── .env                                                        # Environment config
```

---

## Claude Desktop Config

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n8n-local": {
      "url": "http://localhost:3000/api/mcp/sse",
      "authorization": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
```

---

## Claude Code Config

**Project**: `.mcp.json` in project root

**Global**: `~/.claude/config.json`

```json
{
  "mcpServers": {
    "n8n-gateway": {
      "url": "http://localhost:3000/api/mcp/sse",
      "authorization": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Gateway 404 | Use `/api/mcp/sse` (not `/api/mcp`) |
| Auth failed | Check Bearer token format and expiration |
| "Invalid audience" | Verify `NEXT_PUBLIC_BASE_URL` matches expected URL |
| n8n 403 | Verify webhook Header Auth matches N8N_API_KEY |
| Connection failed | Use `n8n` hostname (not localhost) in Docker |
| Workflow not found | Activate workflow in n8n |
| Tool not showing | Reload Claude Desktop/Claude Code completely |

---

## Common Tasks

### Generate New API Key
```bash
openssl rand -base64 32
```

### Check Container Status
```bash
docker ps -a
```

### Enter Container Shell
```bash
docker exec -it n8n-mcp-gateway sh
docker exec -it n8n-instance sh
```

### View Container Environment
```bash
docker exec n8n-mcp-gateway printenv
docker exec n8n-instance printenv
```

### Clean Restart
```bash
docker-compose down
docker-compose up -d --build
```

### Check Descope Access Key
```bash
# Test access key validation
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'
```

---

## OAuth 2.1 Reference

### Discovery Endpoint Response
```json
{
  "authorization_endpoint": "https://api.descope.com/oauth/v1/authorize",
  "token_endpoint": "https://api.descope.com/oauth/v1/token",
  "jwks_uri": "https://api.descope.com/.well-known/jwks.json",
  "scopes": ["mcp:run_n8n_task"],
  "authorization_server": "https://api.descope.com",
  "resource": "http://localhost:3000/api/mcp/sse"
}
```

### WWW-Authenticate Header Format
```
Bearer realm="http://localhost:3000/api/mcp/sse",
       scope="mcp:run_n8n_task",
       authorization_url="https://api.descope.com/oauth/v1/authorize"
```

### Audience Claim Behavior

| Token Type | `aud` Claim | Validation |
|------------|-------------|------------|
| Access Key (M2M) | Descope Project ID | Accepted |
| OAuth Session | Resource URL | Validated against expected URL |

---

## MCP Protocol Reference

### initialize
Establishes MCP connection.

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1,
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "client", "version": "1.0"}
  }
}
```

### tools/list
Returns available tools.

```json
{"jsonrpc":"2.0","method":"tools/list","id":1}
```

### tools/call
Executes a tool with arguments.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "run_n8n_task",
    "arguments": {"data": {...}}
  },
  "id": 1
}
```

### ping
Health check connection.

```json
{"jsonrpc":"2.0","method":"ping","id":1}
```

---

## Available Tools

| Tool | Description | Arguments |
|------|-------------|-----------|
| `run_n8n_task` | Executes an n8n workflow | `data` (object), `workflow` (string, optional) |
