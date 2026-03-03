import { NextRequest, NextResponse } from 'next/server';
import { mcpServer } from '@/lib/mcp-server';
import { validateOAuthToken, createUnauthorizedResponse, createInsufficientScopeResponse } from '@/lib/descope-oauth';

export async function GET(request: NextRequest) {
  // Health check
  if (request.nextUrl.searchParams.get('health') === 'true') {
    return NextResponse.json({ status: 'ok', service: 'n8n-mcp-gateway' });
  }

  // OAuth discovery - return WWW-Authenticate header
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return createUnauthorizedResponse(
    `Bearer realm="${baseUrl}/api/mcp/sse", ` +
    `scope="mcp:run_n8n_task", ` +
    `authorization_url="https://api.descope.com/oauth/v1/authorize"`
  );
}

export async function POST(request: NextRequest) {
  // Health check
  if (request.nextUrl.searchParams.get('health') === 'true') {
    return NextResponse.json({ status: 'ok', service: 'n8n-mcp-gateway' });
  }

  // Validate OAuth token
  const tokenInfo = await validateOAuthToken(request);

  if (!tokenInfo.valid) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return createUnauthorizedResponse(
      `Bearer realm="${baseUrl}/api/mcp/sse", error="invalid_token"`,
      {
        error: 'invalid_token',
        error_description: tokenInfo.error || 'Token validation failed',
      }
    );
  }

  // Check audience claim (for production OAuth tokens)
  // For Access Key (M2M), audience is the Descope Project ID, which we allow
  const expectedAud = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mcp/sse`;
  const descopeProjectId = process.env.DESCOPE_PROJECT_ID;

  // Skip audience check if:
  // 1. No audience claim (Access Key M2M)
  // 2. Audience is the Descope Project ID (Access Key M2M)
  // 3. Audience matches expected URL (proper OAuth token)
  if (tokenInfo.aud &&
      tokenInfo.aud !== expectedAud &&
      tokenInfo.aud !== descopeProjectId &&
      (!Array.isArray(tokenInfo.aud) || !tokenInfo.aud.includes(descopeProjectId))) {
    return createUnauthorizedResponse(
      `Bearer realm="${expectedAud}", ` +
      `error="invalid_token", ` +
      `error_description="Invalid audience: got '${tokenInfo.aud}', expected '${expectedAud}' or '${descopeProjectId}'"`
    );
  }

  // Check scopes (only if scopes are present)
  // MCP spec compliant: require specific scope for tool execution
  const requiredScopes = ['mcp:run_n8n_task'];
  const tokenScopes = tokenInfo.scopes || [];

  // If token has scopes but doesn't have required scopes, return insufficient scope error
  if (tokenScopes.length > 0 && !requiredScopes.every(scope => tokenScopes.includes(scope))) {
    return createInsufficientScopeResponse({
      realm: expectedAud,
      tokenScopes,
      requiredScopes,
    });
  }

  // Parse request body
  interface MCPRequest {
    method: string;
    params?: any;
    id?: string | number;
  }

  let body: MCPRequest;
  try {
    body = await request.json() as MCPRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }

  // Handle MCP request manually
  const { method, params, id } = body;

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'n8n-mcp-gateway',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
            },
          },
        };
        break;

      case 'tools/list':
        result = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'run_n8n_task',
                description: 'Executes an n8n workflow with the provided data',
                inputSchema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      description: 'Data to pass to the n8n workflow',
                    },
                    workflow: {
                      type: 'string',
                      description: 'Optional: Name of the specific workflow to execute',
                    },
                  },
                },
              },
            ],
          },
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        if (name !== 'run_n8n_task') {
          result = {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool not found: ${name}` },
          };
        } else {
          const { triggerWorkflow } = await import('@/lib/n8n');
          const workflowResult = await triggerWorkflow(args?.data || args);
          result = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(workflowResult.data),
                },
              ],
            },
          };
        }
        break;

      case 'ping':
        result = { jsonrpc: '2.0', id, result: {} };
        break;

      default:
        result = {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
