/**
 * MCP Server Route
 * Handles Model Context Protocol requests with Descope authentication
 *
 * This route implements the MCP specification for exposing n8n workflows
 * as tools that AI agents can call.
 */

import { NextRequest } from 'next/server';
import {
  verifyAuthFromRequest,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/descope';
import { availableTools, executeTool } from '@/lib/tools';
import type { Tool, AuthInfo } from '@/types/mcp';

// ========================================
// MCP Protocol Handler
// ========================================

/**
 * Handle MCP initialization (tools/list)
 */
async function handleToolsList(authInfo: AuthInfo) {
  // Filter tools based on user roles/scopes if needed
  const tools = availableTools.filter((tool) => {
    // Example: Only admins can access certain tools
    // if (tool.name === 'dangerous_task') {
    //   return authInfo.roles.includes('Admin');
    // }
    return true;
  });

  return {
    jsonrpc: '2.0',
    id: null,
    result: {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    },
  };
}

/**
 * Handle MCP tool execution (tools/call)
 */
async function handleToolsCall(params: any, authInfo: AuthInfo) {
  const { name, arguments: args } = params;

  if (!name) {
    return {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32602,
        message: 'Invalid params: tool name is required',
      },
    };
  }

  // Optional: Check if user has permission for this tool
  // if (name === 'admin_only_tool' && !authInfo.roles.includes('Admin')) {
  //   return {
  //     jsonrpc: '2.0',
  //     id: null,
  //     error: {
  //       code: -32603,
  //       message: 'Forbidden: insufficient permissions',
  //     },
  //   };
  // }

  try {
    const result = await executeTool(name, args || {});

    if (!result.isSuccess) {
      return {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: result.error || 'Tool execution failed',
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id: null,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.content),
          },
        ],
      },
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    };
  }
}

/**
 * Handle MCP ping
 */
async function handlePing() {
  return {
    jsonrpc: '2.0',
    id: null,
    result: {},
  };
}

/**
 * Handle unknown method
 */
function handleUnknownMethod(method: string) {
  return {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32601,
      message: `Method not found: ${method}`,
    },
  };
}

// ========================================
// HTTP Route Handlers
// ========================================

/**
 * Validate request and extract authentication
 */
async function authenticateRequest(request: NextRequest): Promise<{ authInfo: AuthInfo | null; error?: Response }> {
  // Skip auth for health check
  if (request.nextUrl.searchParams.get('health') === 'true') {
    return { authInfo: { token: '', scopes: [], clientId: 'health' } };
  }

  const authInfo = await verifyAuthFromRequest(request);

  if (!authInfo) {
    return {
      authInfo: null,
      error: createUnauthorizedResponse('Valid Descope token required'),
    };
  }

  return { authInfo };
}

/**
 * Process MCP request
 */
async function processMCPRequest(body: any, authInfo: AuthInfo) {
  const { method, params } = body;

  switch (method) {
    case 'tools/list':
      return handleToolsList(authInfo);

    case 'tools/call':
      return handleToolsCall(params, authInfo);

    case 'ping':
      return handlePing();

    default:
      return handleUnknownMethod(method);
  }
}

/**
 * GET handler - For SSE/STDIO transport
 */
export async function GET(request: NextRequest) {
  // Health check endpoint
  if (request.nextUrl.searchParams.get('health') === 'true') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'n8n-mcp-gateway' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Authenticate
  const { authInfo, error } = await authenticateRequest(request);

  if (error || !authInfo) {
    return error || createUnauthorizedResponse('Authentication failed');
  }

  // SSE support would go here for streaming
  return new Response(
    JSON.stringify({ status: 'ok', authenticated: true, clientId: authInfo.clientId }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/**
 * POST handler - Main MCP request handler
 */
export async function POST(request: NextRequest) {
  // Health check
  if (request.nextUrl.searchParams.get('health') === 'true') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'n8n-mcp-gateway' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Authenticate
  const { authInfo, error } = await authenticateRequest(request);

  if (error || !authInfo) {
    return error || createUnauthorizedResponse('Authentication failed');
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Process MCP request
  const response = await processMCPRequest(body, authInfo);

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Client-Id': authInfo.clientId,
    },
  });
}

/**
 * OPTIONS handler - CORS support
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
