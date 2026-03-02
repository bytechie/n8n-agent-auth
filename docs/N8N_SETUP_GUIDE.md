# n8n Setup Guide for MCP Gateway

This guide walks you through setting up n8n workflows with proper webhook authentication to work with the MCP Gateway.

## Prerequisites

- Docker and Docker Compose installed
- Project already set up with `docker-compose up`
- Access to n8n at http://localhost:5678

---

## Step 1: Access n8n

1. Open your browser and go to: **http://localhost:5678**
2. Login with default credentials (or your configured ones):
   - **Username**: `admin`
   - **Password**: `password`

3. You'll see the n8n workflow editor dashboard

---

## Step 2: Create a New Workflow

1. Click **"Add workflow"** button (or the **+** icon)
2. Name your workflow (e.g., "MCP Test Workflow")
3. Click **"Add workflow"** to create

---

## Step 3: Add a Webhook Trigger

1. In the nodes panel, search for **"Webhook"**
2. Click to add the **Webhook** node to your canvas
3. Click on the Webhook node to configure it

### Webhook Node Configuration:

| Setting | Value |
|---------|-------|
| **HTTP Method** | `POST` |
| **Path** | `mcp-gateway` (or any name you prefer) |
| **Authentication** | `Header Auth` |
| **Header Name** | `X-N8N-API-KEY` |
| **Header Value** | `your_n8n_api_key` (from your `.env`) |

### Detailed Steps for Header Auth:

1. Under **Authentication**, select **"Header Auth"**
2. Click **"Add Header"**
3. Enter:
   - **Name**: `X-N8N-API-KEY`
   - **Value**: `your_n8n_api_key` (from your `.env`)
4. Click **"Save"**

4. **Response Mode**: Select **"When Last Node Finishes"**

5. Click **"Save"** on the node

---

## Step 4: Add Workflow Logic

Now add the actual automation logic. Here's a simple example:

### Example: Echo/Hello World Workflow

1. Add an **"Edit Fields (Set)"** node after the webhook
2. Connect the Webhook node to the Set node
3. In the Set node, add fields to return:
   - Field name: `message`
   - Value: `Hello from n8n MCP!`
   - Field name: `receivedData`
   - Value: `{{ $json }}`

4. Add a **"Respond to Webhook"** node at the end
5. Connect the Set node to the Respond to Webhook node
6. In the Respond to Webhook node:
   - **Respond With**: `Using 'Respond to Webhook' Node`
   - **Response Body**: Select **"JSON"** and use `{{ $json }}`

### Example: Send Email Workflow

1. After the Webhook node, add a **"Gmail"** or **"Send Email"** node
2. Configure the email node with your credentials
3. Use webhook data in the email:
   - To: `{{ $json.email }}`
   - Subject: `{{ $json.subject }}`
   - Text: `{{ $json.message }}`

4. End with **"Respond to Webhook"** node:
   - Response Body: `{"status": "email sent", "to": "{{ $json.email }}"}`

---

## Step 5: Activate the Workflow

1. Click the **"Save"** button in the top right (or press `Ctrl+S`)
2. Click the **"Active"** toggle switch to activate the workflow
3. The workflow will show as **"Active"** in the dashboard

---

## Step 6: Copy the Webhook URL

1. Click on the **Webhook** node in your active workflow
2. Click **"Listen for Test Event"** button (this creates a test URL)
3. Copy the **Production URL** (or Test URL for testing)

The URL will look like:
```
http://localhost:5678/webhook/YOUR-WEBHOOK-PATH
```

**For Docker setup**, the gateway needs the **internal** URL:
```
http://n8n:5678/webhook/YOUR-WEBHOOK-PATH
```

---

## Step 7: Update Environment Variables

Edit your `.env` file to use the new webhook URL:

```bash
# Update with your actual webhook path
N8N_WEBHOOK_URL=http://n8n:5678/webhook/mcp-gateway
```

Or for the UUID-based webhook (if n8n generated one):
```bash
N8N_WEBHOOK_URL=http://n8n:5678/webhook/YOUR-UUID-HERE
```

---

## Step 8: Restart the Gateway

```bash
docker-compose restart gateway
```

---

## Step 9: Test the Integration

### Test directly with curl:

```bash
curl -X POST "http://localhost:5678/webhook/mcp-gateway" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: your_n8n_api_key" \
  -d '{"test": "data"}'
```

### Test via MCP Gateway:

```bash
curl -X POST "http://localhost:3000/api/mcp/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DESCOPE_ACCESS_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "run_n8n_task",
      "arguments": {
        "data": {"test": "value"}
      }
    },
    "id": 1
  }'
```

---

## Common Issues & Solutions

### Issue: "Authorization data is wrong!" (403)

**Cause**: Webhook authentication doesn't match.

**Solutions**:
1. Check the Header Name in n8n webhook node is exactly: `X-N8N-API-KEY`
2. Check the Header Value matches `N8N_API_KEY` in your `.env`
3. Make sure the workflow is **Active** (not just saved)
4. Try re-creating the webhook node with fresh auth settings

### Issue: "Webhook not found"

**Cause**: Workflow is inactive or URL path is wrong.

**Solutions**:
1. Make sure the workflow is toggled **Active**
2. Verify the webhook URL path matches what's in the `.env`
3. Check the n8n logs: `docker logs n8n-instance`

### Issue: Gateway can't reach n8n

**Cause**: Using `localhost` instead of Docker hostname.

**Solutions**:
1. Use `http://n8n:5678` (not `localhost:5678`) in `N8N_WEBHOOK_URL`
2. Verify both containers are on the same Docker network
3. Check `docker-compose.yml` has `env_file` loaded before `environment` overrides

### Issue: CORS errors when calling from browser

**Cause**: Next.js API routes have CORS restrictions.

**Solutions**:
1. The MCP gateway is designed for server-to-server communication (Claude Desktop)
2. For browser access, add your domain to CORS headers in `route.ts`

---

## Security Best Practices

### 1. Use Strong API Keys

Generate a secure key instead of the default:

```bash
# Generate a secure random key
openssl rand -base64 32
```

### 2. Limit Webhook Access

In n8n webhook settings:
- Set **HTTP Method** to `POST` only
- Use **Header Auth** (never leave it as "None")
- Consider adding IP restrictions if using in production

### 3. Rotate Keys Regularly

```bash
# Generate new key
NEW_KEY=$(openssl rand -base64 32)

# Update .env
echo "N8N_API_KEY=$NEW_KEY" >> .env

# Update n8n webhook node with new value

# Restart services
docker-compose restart gateway
```

### 4. Enable n8n Authentication

In `docker-compose.yml`, keep basic auth enabled:

```yaml
n8n:
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-password}
```

### 5. Use HTTPS in Production

For production deployment:
- Use Caddy reverse proxy (commented in docker-compose.yml)
- Configure SSL certificates
- Update webhook URLs to use `https://`

---

## Example Workflows

### Simple Echo Workflow

```
[Webhook] → [Set Fields] → [Respond to Webhook]
```

**Set Fields node**:
```json
{
  "message": "Hello from MCP!",
  "timestamp": "{{ $now }}",
  "received": "{{ $json }}"
}
```

### Data Processing Workflow

```
[Webhook] → [Code] → [Save to Google Sheets] → [Respond to Webhook]
```

**Code node**:
```javascript
// Process incoming data
const items = $input.item.json.data;
const processed = items.map(item => ({
  name: item.name.toUpperCase(),
  count: item.count * 2,
  timestamp: new Date().toISOString()
}));

return processed;
```

### Slack Notification Workflow

```
[Webhook] → [Slack] → [Respond to Webhook]
```

**Slack node**:
- Channel: `#automation`
- Message: `{{ $json.message }}`

---

## Next Steps

1. **Add More Tools**: Edit `gateway/src/lib/tools.ts` to add more MCP tools
2. **Enable RBAC**: Uncomment role-based access control in `route.ts`
3. **Add Logging**: Set up Descope audit logs for tracking
4. **Deploy to Production**: Use Railway, AWS App Runner, or Azure Container Apps

---

## Additional Resources

- [n8n Documentation](https://docs.n8n.io)
- [MCP Specification](https://modelcontextprotocol.io)
- [Descope Documentation](https://docs.descope.com)
