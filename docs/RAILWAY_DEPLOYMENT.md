# Railway Deployment Guide

Deploy the n8n MCP Gateway to Railway with Descope authentication.

---

## Prerequisites

- Railway account (sign up at https://railway.app)
- Descope project with Access Key
- n8n instance (hosted or Railway)

---

## Quick Deploy

### Option 1: Deploy from GitHub

1. **Click the button below** (or manually create a new project in Railway):

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/bytechie/n8n-agent-auth)

2. **Connect your GitHub account** and select this repository

3. **Configure environment variables** (see below)

4. **Deploy!**

---

### Option 2: Manual Deploy

1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `n8n-agent-auth` repository
4. Configure variables (see below)
5. Click **Deploy**

---

## Environment Variables

Configure these in Railway: **Project Settings** → **Variables**

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `NODE_ENV` | Yes | `production` | Set automatically by Railway |
| `PORT` | Yes | (auto-set) | Railway sets this automatically |
| `NEXT_PUBLIC_BASE_URL` | Yes | `https://${RAILWAY_PUBLIC_DOMAIN}` | Use Railway's domain variable |
| `DESCOPE_PROJECT_ID` | Yes | Your Project ID | From Descope Console |
| `DESCOPE_AGENT_ACCESS_KEY` | Yes | Your Access Key | From Descope Console → Access Keys |
| `N8N_WEBHOOK_URL` | Yes | Your n8n webhook URL | e.g., `https://n8n.example.com/webhook/mcp-gateway` |
| `N8N_API_KEY` | Yes | Your n8n API key | For webhook header authentication |

### Setting NEXT_PUBLIC_BASE_URL with Railway Variable

In Railway Variables, set:

```
NEXT_PUBLIC_BASE_URL=https://${RAILWAY_PUBLIC_DOMAIN}
```

Railway will automatically replace `${RAILWAY_PUBLIC_DOMAIN}` with your actual domain like `https://n8n-gateway.up.railway.app`.

---

## n8n Setup on Railway

### Option 1: Host n8n on Railway (Recommended)

1. **Create a new service** in your Railway project
2. **Select n8n from templates** or use Dockerfile:
   ```dockerfile
   FROM n8nio/n8n:latest
   ```
3. **Set n8n environment variables**:
   ```
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=your-username
   N8N_BASIC_AUTH_PASSWORD=your-password
   WEBHOOK_URL=https://your-n8n-service.up.railway.app/
   ```
4. **Configure your n8n workflow**:
   - Create a Webhook trigger node
   - Path: `mcp-gateway`
   - Authentication: `Header Auth`
   - Header Name: `X-N8N-API-KEY`
   - Header Value: Same as `N8N_API_KEY` in gateway

5. **Update gateway's N8N_WEBHOOK_URL**:
   ```
   N8N_WEBHOOK_URL=https://your-n8n-service.up.railway.app/webhook/mcp-gateway
   ```

### Option 2: Use External n8n

If using n8n hosted elsewhere:
1. Set `N8N_WEBHOOK_URL` to your n8n instance webhook URL
2. Make sure your n8n is publicly accessible
3. Configure webhook authentication with `N8N_API_KEY`

---

## Descope Configuration

### 1. Create Access Key

In [Descope Console](https://app.descope.com):

1. Navigate to **Access Keys** → **Machine-to-Machine**
2. Click **Create Access Key**
3. Configure:
   - **Name**: `railway-n8n-gateway`
   - **Expires**: Set appropriate expiration (or never)
   - **Key**: Generate or provide your own
4. Copy the **Access Key** - paste into `DESCOPE_AGENT_ACCESS_KEY`

### 2. Update OAuth Redirect URI (for interactive auth)

If using OAuth user flow (not Access Keys):

1. Go to **Applications** → Your application
2. Add to **Redirect URIs**:
   ```
   https://your-gateway.up.railway.app/api/mcp/sse
   ```

---

## Railway Service Configuration

### Health Check

The `railway.toml` includes health check configuration:

```toml
[healthCheck]
path = "/api/mcp/sse?health=true"
port = 3000
timeoutSeconds = 5
intervalSeconds = 30
```

Railway will automatically restart the service if health checks fail.

### Domains

Railway provides a default domain:
```
https://your-project.up.railway.app
```

To use a custom domain:
1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

---

## Deployment Steps

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Or link existing project
railway link
```

### 2. Set Environment Variables

```bash
# Via CLI
railway variables set DESCOPE_PROJECT_ID=your_project_id
railway variables set DESCOPE_AGENT_ACCESS_KEY=your_access_key
railway variables set N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/mcp-gateway
railway variables set N8N_API_KEY=your_n8n_api_key
railway variables set NEXT_PUBLIC_BASE_URL=https://${RAILWAY_PUBLIC_DOMAIN}

# Or set in Railway dashboard UI
```

### 3. Deploy

```bash
# Trigger deployment
railway up

# Or just push to GitHub (if connected)
git push origin main
```

### 4. Verify Deployment

```bash
# Check deployment status
railway status

# View logs
railway logs

# Open in browser
railway domain
```

---

## Testing the Deployment

### 1. Health Check

```bash
curl https://your-gateway.up.railway.app/api/mcp/sse?health=true
```

Expected response:
```json
{"status":"ok","service":"n8n-mcp-gateway"}
```

### 2. OAuth Metadata

```bash
curl https://your-gateway.up.railway.app/.well-known/oauth-protected-metadata
```

### 3. Test MCP Connection

```bash
curl -X POST https://your-gateway.up.railway.app/api/mcp/sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## Claude Desktop/Claude Code Configuration

After deployment, update your MCP configuration to use the Railway URL:

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n8n-gateway": {
      "url": "https://your-gateway.up.railway.app/api/mcp/sse",
      "authorization": {
        "type": "http_header",
        "name": "Authorization",
        "value": "Bearer YOUR_DESCOPE_ACCESS_KEY"
      }
    }
  }
}
```

### Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "n8n-gateway": {
      "url": "https://your-gateway.up.railway.app/api/mcp/sse",
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

## Monitoring & Logs

### View Logs

```bash
# Via CLI
railway logs

# Stream logs in real-time
railway logs --tail

# View specific deployment
railway logs --deployment <deployment-id>
```

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request counts

View in Railway dashboard under **Metrics**.

---

## Troubleshooting

### Issue: "Invalid audience" error

**Cause**: `NEXT_PUBLIC_BASE_URL` doesn't match the actual domain.

**Solution**:
1. Make sure `NEXT_PUBLIC_BASE_URL` is set to: `https://${RAILWAY_PUBLIC_DOMAIN}`
2. Or set it to your exact Railway domain: `https://your-project.up.railway.app`

### Issue: Health check failing

**Cause**: Service not responding on port 3000.

**Solution**:
1. Check logs: `railway logs`
2. Verify `PORT` environment variable is set (Railway sets this automatically)
3. Make sure Next.js standalone build is working

### Issue: n8n webhook connection timeout

**Cause**: n8n service not accessible from Railway.

**Solution**:
1. If using Railway n8n service, use the private domain: `https://your-n8n-service.railway.internal`
2. If using external n8n, ensure it's publicly accessible
3. Check n8n webhook is active (not in "production" mode without activation)

### Issue: Descope authentication fails

**Cause**: Invalid Access Key or Project ID.

**Solution**:
1. Verify `DESCOPE_PROJECT_ID` matches your Descope project
2. Verify `DESCOPE_AGENT_ACCESS_KEY` is correct and not expired
3. Check Descope audit logs for detailed error messages

---

## Cost Estimates

Railway pricing (as of 2026):

| Plan | Price | Includes |
|------|-------|----------|
| Free | $0/month | $5 credit, then pay-as-you-go |
| Starter | $5/month | Reduced usage rates |
| Pro | $20/month | Further reduced rates |

Typical usage for n8n MCP Gateway:
- **CPU**: ~10-50 MB (minimal)
- **Memory**: ~256-512 MB
- **Estimated cost**: $2-5/month on Starter plan

---

## Scaling

Railway automatically scales your service based on traffic. To configure:

1. Go to **Service Settings** → **Scaling**
2. Set **Min instances** (e.g., 1)
3. Set **Max instances** (e.g., 3)
4. Railway will scale up/down based on demand

---

## Updates

To update your deployment:

1. **Push to GitHub** (if connected)
   ```bash
   git push origin main
   ```

2. **Or redeploy via CLI**
   ```bash
   railway up
   ```

Railway will automatically build and deploy the new version.

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/reference/variables)
- [Descope Documentation](https://descope.com/docs)
- [n8n Documentation](https://docs.n8n.io)
