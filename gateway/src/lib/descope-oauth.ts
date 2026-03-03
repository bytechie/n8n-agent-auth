import { NextRequest } from 'next/server';
import DescopeClient from '@descope/node-sdk';

// Lazy initialization of Descope client to avoid build-time errors
// The client is only initialized when first needed at runtime
let client: ReturnType<typeof DescopeClient> | null = null;

function getClient() {
  if (!client) {
    const projectId = process.env.DESCOPE_PROJECT_ID;
    if (!projectId) {
      throw new Error('DESCOPE_PROJECT_ID environment variable is not set');
    }
    client = DescopeClient({ projectId });
  }
  return client;
}

export interface TokenInfo {
  valid: boolean;
  aud?: string;
  scopes?: string[];
  userId?: string;
  tenantId?: string;
  error?: string;
  // For enhanced scope validation
  rawToken?: any;
}

export async function validateOAuthToken(request: NextRequest): Promise<TokenInfo> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const token = authHeader.substring(7);

  try {
    // Validate using Descope's session validation
    const session = await getClient().validateSession(token);

    if (session) {
      const sessionToken = session.token as any;
      return {
        valid: true,
        aud: sessionToken?.aud,
        scopes: sessionToken?.scope?.split(' ') || [],
        userId: sessionToken?.sub,
        tenantId: sessionToken?.tid,
      };
    }
  } catch (sessionError) {
    // Session validation failed, try Access Key exchange
  }

  try {
    // Try Access Key exchange (for M2M)
    const exchange = await getClient().exchangeAccessKey(token);
    if (exchange) {
      const exchangeToken = exchange.token as any;
      return {
        valid: true,
        aud: exchangeToken?.aud,
        scopes: exchangeToken?.scope?.split(' ') || [],
        userId: exchangeToken?.sub,
        tenantId: exchangeToken?.tid,
      };
    }
  } catch (exchangeError) {
    return {
      valid: false,
      error: exchangeError instanceof Error ? exchangeError.message : 'Invalid token',
    };
  }

  return { valid: false, error: 'Invalid token' };
}

export function createUnauthorizedResponse(
  wwwAuthenticate: string,
  body?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify(body || { error: 'Unauthorized' }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': wwwAuthenticate,
      },
    }
  );
}

/**
 * Create an insufficient scope error response (MCP spec compliant)
 * Based on Descope Python MCP SDK's InsufficientScopeError
 */
export function createInsufficientScopeResponse(params: {
  realm: string;
  tokenScopes: string[];
  requiredScopes: string[];
}): Response {
  const { realm, tokenScopes, requiredScopes } = params;

  // Find missing scopes
  const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));

  // Combine all scopes (existing + required) as per MCP spec recommendation
  const allScopes = Array.from(new Set([...tokenScopes, ...requiredScopes]));

  const errorBody = {
    error: 'insufficient_scope',
    scope: allScopes.join(' '),
    error_description: `Missing required scope: ${missingScopes.join(', ')}`,
    missing_scopes: missingScopes,
    token_scopes: tokenScopes,
    required_scopes: requiredScopes,
  };

  return new Response(JSON.stringify(errorBody), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer realm="${realm}", error="insufficient_scope", scope="${allScopes.join(' ')}"`,
    },
  });
}
