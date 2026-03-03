import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const projectId = process.env.DESCOPE_PROJECT_ID;
  const descopeUrl = 'https://api.descope.com';

  if (!projectId) {
    return NextResponse.json(
      { error: 'DESCOPE_PROJECT_ID not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authorization_endpoint: `${descopeUrl}/oauth/v1/authorize`,
    token_endpoint: `${descopeUrl}/oauth/v1/token`,
    issuer: `${descopeUrl}/v1/apps/customized/${projectId}`,
    jwks_uri: `${descopeUrl}/${projectId}/.well-known/jwks.json`,
    scopes: ["mcp:run_n8n_task"],
    authorization_server: descopeUrl,
    resource: `${baseUrl}/api/mcp/sse`
  });
}
