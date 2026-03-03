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
  wwwAuthenticate: string
): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': wwwAuthenticate,
      },
    }
  );
}
