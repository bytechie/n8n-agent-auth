import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const descopeUrl = 'https://api.descope.com';

  return NextResponse.json({
    authorization_endpoint: `${descopeUrl}/oauth/v1/authorize`,
    token_endpoint: `${descopeUrl}/oauth/v1/token`,
    jwks_uri: `${descopeUrl}/.well-known/jwks.json`,
    scopes: ["mcp:run_n8n_task"],
    authorization_server: descopeUrl,
    resource: `${baseUrl}/api/mcp/sse`
  });
}
