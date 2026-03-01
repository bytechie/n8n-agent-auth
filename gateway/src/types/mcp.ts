/**
 * MCP (Model Context Protocol) Type Definitions
 * Based on @modelcontextprotocol/sdk
 */

// ========================================
// Authentication Types
// ========================================

export interface AuthInfo {
  /** The bearer token */
  token: string;
  /** Granted scopes/permissions */
  scopes: string[];
  /** Client/agent identifier */
  clientId: string;
  /** Optional user ID */
  userId?: string;
  /** Optional roles */
  roles?: string[];
}

// ========================================
// Tool Types
// ========================================

export interface Tool {
  /** Tool name */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  /** Tool name to execute */
  name: string;
  /** Arguments to pass to the tool */
  arguments?: Record<string, unknown>;
}

export interface ToolResult {
  /** Result content */
  content: unknown;
  /** Whether the call was successful */
  isSuccess: boolean;
  /** Error message if failed */
  error?: string;
}

// ========================================
// Request/Response Types
// ========================================

export interface MCPRequest {
  /** Request method */
  method: string;
  /** Request params */
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  /** Response result */
  result?: unknown;
  /** Error details */
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ========================================
// n8n Types
// ========================================

export interface N8NWebhookRequest {
  /** Data to send to n8n workflow */
  body?: Record<string, unknown>;
  /** Optional query parameters */
  query?: Record<string, string>;
}

export interface N8NWebhookResponse {
  /** Response data from n8n */
  data: unknown;
  /** Status code */
  status: number;
}
