# Setup Guide: Descope + Claude Desktop/Claude Code

This guide covers setting up the n8n MCP Gateway with Descope authentication for use with Claude Desktop or Claude Code.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Descope Setup](#descope-setup)
3. [Local Development](#local-development)
4. [Claude Desktop Setup](#claude-desktop-setup)
5. [Claude Code Setup](#claude-code-setup)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## Prerequisites

- Docker and Docker Compose installed
- A Descope account (sign up at https://descope.com)
- n8n instance running (local or hosted)
- Claude Desktop (optional) or Claude Code

---

## Descope Setup

### Step 1: Create a Descope Project

1. Log in to [Descope Console](https://app.descope.com)
2. Create a new project or use an existing one
3. Note your **Project ID** from the project settings

### Step 2: Create an Access Key (for Local Development)

1. Navigate to **Access Keys** in the left sidebar
2. Click **Create Access Key**
3. Configure the key:
   - **Name**: `n8n-mcp-gateway-local`
   - **Key Value**: Generate or use the provided key
   - **Expires**: Set appropriate expiration (or never for development)
4. Copy the **Access Key** - you'll need it for your `.env` file

### Step 3: Configure OAuth 2.1 (for Production)

1. Navigate to **Applications** in the left sidebar
2. Create a new application:
   - **Name**: `n8n-mcp-gateway`
   - **Type**: **Machine-to-Machine (M2M)** or **Regular Web Application**
3. Configure OAuth settings:
   - **Redirect URIs**: Add your production gateway URL
   - **Scopes**: Add custom scope `mcp:run_n8n_task`
4. Note the **Client ID** and **Client Secret**

### Step 4: Configure User Consent Flow (Optional, for User Auth)

1. Navigate to **SSO** > **OIDC**
2. Configure your consent screen
3. Add the `mcp:run_n8n_task` scope to your allowed scopes

### Step 5: Create Access Control Policies (Optional)

1. Navigate to **Authorization** > **Policies**
2. Create policies to govern:
   - Which agents can access which n8n workflows
   - Rate limiting
   - IP restrictions

---

## Local Development

### Step 1: Clone and Configure

```bash
git clone <your-repo-url>
cd n8n-agent-auth
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Descope Configuration
DESCOPE_PROJECT_ID=your_descope_project_id
DESCOPE_AGENT_ACCESS_KEY=your_descope_access_key

# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/your-webhook-path
N8N_API_KEY=your_n8n_api_key

# Gateway Configuration
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
GATEWAY_PUBLIC_URL=http://localhost:3000
```

### Step 3: Start n8n

```bash
docker-compose up -d n8n
```

Access n8n at http://localhost:5678

### Step 4: Start the Gateway

```bash
docker-compose up -d gateway
```

### Step 5: Verify Installation

```bash
# Health check
curl http://localhost:3000/api/mcp/sse?health=true

# OAuth metadata
curl http://localhost:3000/.well-known/oauth-protected-metadata

# Test MCP connection
curl -X POST http://localhost:3000/api/mcp/sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## Claude Desktop Setup

### Step 1: Locate Claude Desktop Config

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Step 2: Add MCP Server Configuration

Edit the config file and add:

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

Replace `YOUR_DESCOPE_ACCESS_KEY` with your actual Access Key from Descope.

### Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop

### Step 4: Verify Connection

1. Open a new chat in Claude Desktop
2. Type: "What tools are available?"
3. You should see `run_n8n_task` in the tool list

---

## Claude Code Setup

### Option 1: Using .mcp.json (Project-Specific)

Create a `.mcp.json` file in your project root:

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

Then reload the Claude Code window.

### Option 2: Using Global Config

Edit the global Claude Code config:
- **Location**: `~/.claude/config.json` (create if it doesn't exist)

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

### Reload Claude Code

Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) and select **"Reload Window"**

### Verify Connection

1. Open a new chat in Claude Code
2. The `run_n8n_task` tool should appear in the available tools

---

## Production Deployment

### Step 1: Prepare Environment

Create a production `.env` file:

```bash
# Descope Configuration
DESCOPE_PROJECT_ID=your_production_project_id

# n8n Configuration (use hosted n8n or internal URL)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/production
N8N_API_KEY=your_production_n8n_api_key

# Gateway Configuration
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-gateway-url.com
GATEWAY_PUBLIC_URL=https://your-gateway-url.com
```

### Step 2: Deploy to Production

Choose your deployment method:

#### Option A: Docker Compose (VPS)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Option B: Cloud Run (GCP)

```bash
gcloud run deploy n8n-mcp-gateway --source . --platform managed
```

#### Option C: Railway/Render/Fly.io

Follow the platform's deployment instructions for Docker containers.

### Step 3: Configure OAuth for Production

1. Update Descope Application with your production URL as redirect URI
2. For user authentication, configure the consent flow
3. Set up proper CORS for your domain

### Step 4: Update Claude Config for Production

Update your MCP server configuration to use the production URL:

```json
{
  "mcpServers": {
    "n8n-gateway": {
      "url": "https://your-gateway-url.com/api/mcp/sse",
      "authorization": {
        "type": "oauth"
      }
    }
  }
}
```

### Step 5: Test Production Setup

```bash
# Health check
curl https://your-gateway-url.com/api/mcp/sse?health=true

# OAuth metadata
curl https://your-gateway-url.com/.well-known/oauth-protected-metadata
```

---

## Verifying the Setup

This section covers how to verify that your entire authentication and n8n execution flow is working correctly.

### Verification Checklist

| Step | Where to Check | What to Look For |
|------|----------------|------------------|
| **Gateway Health** | Terminal/Curl | `{"status":"ok"}` response |
| **OAuth Discovery** | Gateway | `Bearer realm` header with Descope URL |
| **Descope Auth** | Descope Console → Audit | Access Key validation events |
| **Gateway Processing** | Gateway logs | `Triggering n8n workflow` entries |
| **n8n Execution** | n8n UI → Executions | Workflow runs with your data |
| **n8n Response** | Gateway logs | `n8n response status: 200` |

### Quick Verification Commands

```bash
# 1. Health check (no auth required)
curl "http://localhost:3000/api/mcp/sse?health=true"
# Expected: {"status":"ok","service":"n8n-mcp-gateway"}

# 2. Test OAuth discovery header
curl -v "http://localhost:3000/api/mcp/sse" 2>&1 | grep "www-authenticate"
# Expected: Bearer realm="http://localhost:3000/api/mcp/sse", scope="mcp:run_n8n_task"...

# 3. OAuth metadata endpoint
curl "http://localhost:3000/.well-known/oauth-protected-metadata"
# Expected: JSON with authorization_endpoint, token_endpoint, jwks_uri

# 4. Test authenticated MCP connection
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# Expected: JSON with tools array containing "run_n8n_task"

# 5. Execute an n8n task
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "run_n8n_task",
      "arguments": {"message": "Test message"}
    },
    "id": 1
  }'
# Expected: JSON with result containing n8n response data
```

### Monitoring Logs

#### Gateway Logs (Real-time)
```bash
docker logs -f n8n-mcp-gateway
```

Look for entries like:
```
Triggering n8n workflow: http://n8n:5678/webhook/mcp-gateway
API Key (first 10 chars): Cbkgdio7Gv...
Request data: { "message": "your message" }
n8n response status: 200
```

#### n8n Logs
```bash
docker logs -f n8n-instance
```

#### Check Both Services Status
```bash
docker ps --filter "name=n8n"
```

### Checking in Descope Console

Navigate to **https://app.descope.com** → Your Project

#### Authentication Logs
Go to: **`Audit`** → **`Authentication`** or **`Audit Trail`**

You should see:
- **Event Type**: `Access Key Validated` or `M2M Authentication`
- **Client ID**: Your Access Key identifier
- **Timestamp**: When the request was made
- **Status**: Success

#### Access Key Monitoring
Go to: **`Access Keys`** → **`Machine-to-Machine`**

You can see:
- Which Access Keys are active
- Usage statistics
- Last used timestamp

#### JWT Debugging
Go to: **`JWT`** → **`Debugger`**

Paste your Bearer token to:
- Decode and inspect claims
- Verify `aud` claim includes your Project ID
- Check expiration and other claims

### Checking n8n Executions

#### Via n8n Web UI
1. Go to **http://localhost:5678**
2. Click **`Executions`** in the left sidebar
3. See all workflow runs with:
   - Timestamp of execution
   - Input data (your message)
   - Output/response
   - Execution status (Success/Error)

#### Via API
```bash
# Test n8n webhook directly
curl -X POST "http://localhost:5678/webhook/YOUR_PATH" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: YOUR_N8N_KEY" \
  -d '{"test": "direct webhook test"}'
```

### Verifying VS Code / Claude Code Integration

To confirm VS Code is using Descope authentication:

1. **Check MCP Configuration**
   - Project: `.mcp.json` in project root
   - Global: `~/.claude/config.json`
   - Should contain `authorization` with Bearer token

2. **Check Gateway Logs**
   - Every tool invocation shows API Key validation
   - Look for `Request data:` entries in logs

3. **Test from Claude Code**
   - Open a chat and type: "What tools are available?"
   - The `run_n8n_task` tool should appear
   - Try: "Run an n8n task with {message: 'test'}"

### Common Verification Issues

| Symptom | Check | Solution |
|---------|-------|----------|
| `401 Unauthorized` | Bearer token valid? | Verify Access Key in `.env` |
| `404 Not Found` | URL path correct? | Use `/api/mcp/sse` not `/api/mcp` |
| `Invalid audience` | `NEXT_PUBLIC_BASE_URL` | Ensure matches gateway URL |
| `n8n 403` | API Key match? | Verify `N8N_API_KEY` matches n8n webhook |
| `Tool not found` | MCP connection? | Restart Claude Code, check logs |
| `No executions` | Workflow active? | Activate workflow in n8n UI |

---

## Troubleshooting

### Issue: "Unauthorized" Response

**Symptoms**: Getting 401 errors with "Invalid token" or "Invalid audience"

**Solutions**:
1. Verify your Access Key is correct and not expired
2. Check `DESCOPE_PROJECT_ID` matches your Descope project
3. Verify `NEXT_PUBLIC_BASE_URL` is set correctly
4. Check gateway logs: `docker logs n8n-mcp-gateway`

### Issue: Tool Not Showing in Claude

**Symptoms**: `run_n8n_task` tool doesn't appear in tool list

**Solutions**:
1. Verify the gateway is running: `curl http://localhost:3000/api/mcp/sse?health=true`
2. Check MCP server configuration URL is correct
3. Restart Claude Desktop/Claude Code completely
4. Check browser/console for errors in Claude Desktop

### Issue: n8n Webhook Failing

**Symptoms**: Tool execution fails with n8n connection error

**Solutions**:
1. Verify n8n is running and accessible
2. Check `N8N_WEBHOOK_URL` is correct
3. Verify `N8N_API_KEY` matches your n8n webhook header
4. Test n8n webhook directly: `curl -X POST $N8N_WEBHOOK_URL -H "X-N8N-API-KEY: $N8N_API_KEY"`

### Issue: OAuth Discovery Failing

**Symptoms**: `.well-known/oauth-protected-metadata` returns 404

**Solutions**:
1. Ensure you're using the latest gateway code
2. Rebuild gateway: `docker-compose up -d --build gateway`
3. Check Next.js is serving the route correctly

---

## Next Steps

### 1. Complete Current Setup

If you just finished the initial setup:

- [ ] Verify gateway health: `curl "http://localhost:3000/api/mcp/sse?health=true"`
- [ ] Test OAuth discovery: `curl "http://localhost:3000/.well-known/oauth-protected-metadata"`
- [ ] Run a test n8n task from Claude Code
- [ ] Check Descope audit logs show the authentication event
- [ ] Verify n8n execution appears in n8n UI at `http://localhost:5678/executions`

### 2. Create Additional n8n Workflows

The current gateway has one tool (`run_n8n_task`). Consider adding specialized workflows:

**Workflow Ideas:**

- **Email Sender**: `send_email` tool with recipient, subject, body
- **Data Query**: `query_database` tool for SQL queries
- **File Operations**: `process_file` tool for document handling
- **External APIs**: `call_api` tool for third-party integrations

**Implementation:**

1. Create workflow in n8n with a webhook trigger
2. Add the workflow to your n8n instance
3. Update `gateway/src/app/api/mcp/[...transport]/route.ts` to add the new tool

```typescript
// Example: Adding a new tool
case 'tools/call':
  const { name, arguments: args } = params;
  if (name === 'send_email') {
    const emailResult = await triggerWorkflow({
      action: 'send_email',
      ...args
    });
    result = { jsonrpc: '2.0', id, result: emailResult };
  }
```

### 3. Enhance Security

**Immediate Actions:**

- [ ] Set expiration dates on development Access Keys
- [ ] Generate new `N8N_API_KEY` using `openssl rand -base64 32`
- [ ] Enable Descope audit logging alerts
- [ ] Add IP restrictions in Descope (for production)

**Access Control:**

- [ ] Create separate Access Keys for dev/staging/production
- [ ] Configure rate limiting in Descope
- [ ] Set up Descope policies for different user roles
- [ ] Implement scope-based access (e.g., `mcp:read`, `mcp:write`)

### 4. Production Deployment

**Infrastructure:**

- [ ] Choose hosting platform (Railway, Render, Fly.io, AWS ECS)
- [ ] Set up custom domain with SSL
- [ ] Configure environment variables for production
- [ ] Set up CI/CD for automated deployments

**Descope Production Config:**

- [ ] Create production Descope project or environment
- [ ] Configure proper redirect URIs
- [ ] Set up user consent flow if using interactive authentication
- [ ] Configure allowed origins for CORS

**Monitoring:**

- [ ] Set up health check endpoint monitoring
- [ ] Configure logging aggregation (e.g., CloudWatch, Datadog)
- [ ] Set up alerting for failed authentications
- [ ] Monitor n8n execution success rates

### 5. Documentation

**Project Docs:**

- [ ] Document each n8n workflow with input/output schemas
- [ ] Create API documentation for your team
- [ ] Add examples of common use cases
- [ ] Document troubleshooting procedures

**User Guides:**

- [ ] Create quick start guide for new developers
- [ ] Document Claude Code configuration steps
- [ ] Add troubleshooting FAQ

### 6. Advanced Features (Optional)

**Multi-Tenancy:**

- Add tenant isolation using Descope's JWT claims
- Route requests to different n8n workflows based on tenant
- Implement per-tenant rate limiting

**Streaming & Long-Running Tasks:**

- Implement SSE for real-time progress updates
- Add support for async task execution with status polling
- Create workflow execution history endpoint

**Enhanced Tool Discovery:**

- Add tool descriptions that include parameter schemas
- Implement dynamic tool registration from n8n
- Add tool versioning support

---

## Configuration Reference

### Environment Variables

| Variable            | Required | Description                    | Example                              |
|---------------------|----------|--------------------------------|--------------------------------------|
| `DESCOPE_PROJECT_ID`      | Yes      | Descope Project ID             | `P3AM5...` (from Descope console)    |
| `DESCOPE_AGENT_ACCESS_KEY` | For dev  | M2M Access Key                 | `K3AM7...`                           |
| `N8N_WEBHOOK_URL`    | Yes      | n8n webhook URL                | `http://localhost:5678/webhook/...`  |
| `N8N_API_KEY`        | Yes      | n8n API key                    | `your-api-key`                       |
| `NEXT_PUBLIC_BASE_URL` | Yes     | Gateway public URL             | `http://localhost:3000`              |
| `PORT`               | No       | Gateway port (default: 3000)   | `3000`                               |
| `NODE_ENV`           | No       | Environment                    | `production`                         |

### MCP Server Config Options

| Option                | Type     | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| `url`                 | string   | Gateway MCP endpoint URL                         |
| `authorization.type`  | string   | `http_header` for keys, `oauth` for OAuth       |
| `authorization.name`  | string   | Header name (default: `Authorization`)           |
| `authorization.value` | string   | Bearer token value (for http_header)             |

---

## Additional Resources

- [Descope Documentation](https://descope.com/docs)
- [MCP Specification](https://modelcontextprotocol.io)
- [n8n Documentation](https://docs.n8n.io)
- [Claude Desktop MCP Setup](https://claude.ai/mcp)

---

## Support

For issues specific to:

- **Descope**: Check [Descope Support](https://descope.com/support)
- **n8n**: Check [n8n Community](https://community.n8n.io)
- **MCP Protocol**: Check [MCP GitHub](https://github.com/modelcontextprotocol)
