/**
 * Descope Authentication Client
 * Handles token validation and user authentication
 */

import DescopeClient from '@descope/node-sdk';
import type { AuthInfo } from '@/types/mcp';

// Initialize Descope client
const descope = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID || '',
});

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined;

  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return undefined;
  }

  return parts[1];
}

/**
 * Validate a Descope Bearer token and return AuthInfo
 */
export async function validateToken(
  bearerToken: string,
): Promise<AuthInfo | null> {
  if (!bearerToken) {
    return null;
  }

  try {
    // Validate the session/token with Descope
    const authResponse = await descope.validateSession(bearerToken);

    if (!authResponse.token?.sub) {
      console.error('Descope token missing subject');
      return null;
    }

    const token = authResponse.token;

    // Map Descope claims to our AuthInfo interface
    return {
      token: bearerToken,
      scopes: token.scope ? token.scope.split(' ') : [],
      clientId: token.sub,
      userId: token.sub,
      roles: token.roles || [],
    };
  } catch (error) {
    console.error('Descope token validation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Verify authentication from a Request object
 */
export async function verifyAuthFromRequest(
  request: Request,
): Promise<AuthInfo | null> {
  // Get Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    console.error('Missing Authorization header');
    return null;
  }

  // Extract bearer token
  const bearerToken = extractBearerToken(authHeader);

  if (!bearerToken) {
    console.error('Invalid Authorization header format');
    return null;
  }

  // Validate with Descope
  return validateToken(bearerToken);
}

/**
 * Check if the authenticated user has a specific role
 */
export function hasRole(authInfo: AuthInfo, role: string): boolean {
  return authInfo.roles?.includes(role) ?? false;
}

/**
 * Check if the authenticated user has a specific scope
 */
export function hasScope(authInfo: AuthInfo, scope: string): boolean {
  return authInfo.scopes.includes(scope);
}

/**
 * Create a denial response for unauthorized access
 */
export function createUnauthorizedResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: reason,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

/**
 * Create a forbidden response for insufficient permissions
 */
export function createForbiddenResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message: reason,
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}
