/**
 * n8n MCP Gateway - Home Page
 */
'use client';

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
        }}>
          n8n MCP Gateway
        </h1>

        <p style={{
          fontSize: '1.25rem',
          opacity: 0.9,
          marginBottom: '2rem',
        }}>
          Secure Model Context Protocol server for n8n workflows
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
          }}>
            Status: Operational
          </h2>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse 2s infinite',
            }} />
            <span>MCP Server Running</span>
          </div>
        </div>

        <div style={{
          fontSize: '0.875rem',
          opacity: 0.8,
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>MCP Endpoint:</strong> /api/mcp
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Health Check:</strong>{' '}
            <a href="/api/mcp?health=true" style={{ color: '#fbbf24' }}>
              /api/mcp?health=true
            </a>
          </p>
          <p>
            <strong>Authentication:</strong> Descope Bearer Token
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  );
}
