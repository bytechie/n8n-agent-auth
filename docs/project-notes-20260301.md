# Project Notes - n8n Agent Auth
**Date**: 2026-03-01

---

## Project Overview

Secure MCP (Model Context Protocol) Gateway that exposes n8n workflows as tools for AI agents (like Claude Desktop) with Descope authentication.

---

## Architecture

```
Claude Desktop ──[Bearer Token]──► MCP Gateway ──[X-N8N-API-KEY]──► n8n Workflows
                      │                               │
                   Descope Auth                    Automation
```

---

## Issues Fixed (2026-03-01)

### 1. TypeScript Build Errors
**File**: `gateway/src/lib/descope.ts`
- Fixed `token.scope.split()` type error by adding proper type casting
- Fixed `token.roles` type error

**File**: `gateway/src/lib/n8n.ts`
- Fixed `responseData?.error` type error with proper type assertion

### 2. Docker Build Error
**Issue**: Missing `/app/public` folder caused build to fail
**Fix**: Created `gateway/public/.gitkeep`

### 3. MCP Route Path Issue
**Issue**: `/api/mcp` returns 404
**Fix**: Route requires a path segment. Use `/api/mcp/sse` or `/api/mcp/health`

### 4. Docker Network Issue
**Issue**: Gateway couldn't reach n8n (using `localhost`)
**Fix**: Updated `docker-compose.yml` to use `n8n` hostname:
```yaml
environment:
  - N8N_WEBHOOK_URL=http://n8n:5678/webhook/mcp-gateway
```

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Gateway Container | ✅ Running | Port 3000 |
| n8n Container | ✅ Running | Port 5678 |
| Descope Auth | ✅ Working | Token validation works |
| MCP tools/list | ✅ Working | Returns `run_n8n_task` |
| n8n Webhook | ⚠️ Needs Config | Webhook auth needs setup |

---

## Remaining Tasks

### 1. Configure n8n Webhook Authentication
The n8n webhook needs to be configured with Header Auth:
- **Header Name**: `X-N8N-API-KEY`
- **Header Value**: Value from `.env` `N8N_API_KEY`

**Steps**:
1. Open n8n at http://localhost:5678 (admin/password)
2. Edit workflow > Webhook node
3. Set Authentication > Header Auth
4. Add header with name and value
5. Activate workflow

See `docs/N8N_SETUP_GUIDE.md` for detailed instructions.

### 2. Test End-to-End Flow
After webhook config, test with:
```bash
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"run_n8n_task","arguments":{"data":{"test":"value"}}},"id":1}'
```

---

## Environment Variables

```bash
# Descope
DESCOPE_PROJECT_ID=your_descope_project_id
DESCOPE_AGENT_ACCESS_KEY=your_descope_access_key

# n8n
N8N_WEBHOOK_URL=http://n8n:5678/webhook/mcp-gateway
N8N_API_KEY=your_n8n_api_key
```

---

## Documentation Created

- `docs/N8N_SETUP_GUIDE.md` - Complete n8n configuration guide
- `docs/QUICK_REFERENCE.md` - Commands and troubleshooting reference

---

## Git Status

### Modified Files
- `gateway/src/lib/descope.ts` - Type casting fixes
- `gateway/src/lib/n8n.ts` - Type assertion fix
- `docker-compose.yml` - Network hostname fix

### New Files
- `gateway/public/.gitkeep` - Docker build fix
- `docs/N8N_SETUP_GUIDE.md` - Setup documentation
- `docs/QUICK_REFERENCE.md` - Quick reference

---

## Useful Commands

```bash
# Start services
docker-compose up -d

# View logs
docker logs -f n8n-mcp-gateway
docker logs -f n8n-instance

# Restart gateway
docker-compose restart gateway

# Health check
curl "http://localhost:3000/api/mcp/sse?health=true"
```

---

## Claude Desktop Configuration

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
