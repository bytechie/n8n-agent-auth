/**
 * n8n Webhook Client
 * Handles communication with n8n workflows
 */

import type { N8NWebhookRequest, N8NWebhookResponse } from '@/types/mcp';

/**
 * Configuration for n8n webhook
 */
interface N8NConfig {
  webhookUrl: string;
  apiKey: string;
}

/**
 * Get n8n configuration from environment
 */
function getN8NConfig(): N8NConfig {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL environment variable is not set');
  }

  if (!apiKey) {
    throw new Error('N8N_API_KEY environment variable is not set');
  }

  return { webhookUrl, apiKey };
}

/**
 * Trigger an n8n workflow via webhook
 */
export async function triggerWorkflow(
  data: Record<string, unknown> = {},
): Promise<N8NWebhookResponse> {
  const config = getN8NConfig();

  console.log(`Triggering n8n workflow: ${config.webhookUrl}`);
  console.log('API Key (first 10 chars):', config.apiKey.substring(0, 10) + '...');
  console.log('Request data:', JSON.stringify(data, null, 2));

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.apiKey,
      },
      body: JSON.stringify(data),
    });

    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Parse response
    const responseData = await response.json().catch(() => null) as Record<string, unknown> | null;

    console.log(`n8n response status: ${response.status}`);

    if (!response.ok) {
      console.error('n8n webhook error:', responseData);
      throw new Error(
        (responseData?.error as string | undefined) || `n8n webhook failed with status ${response.status}`,
      );
    }

    return {
      data: responseData,
      status: response.status,
    };
  } catch (error) {
    console.error('Failed to trigger n8n workflow:', error);

    throw new Error(
      `Failed to trigger n8n workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Format n8n response for MCP tool result
 */
export function formatN8NResponse(result: N8NWebhookResponse): {
  content: unknown;
  isSuccess: boolean;
} {
  return {
    content: result.data,
    isSuccess: result.status >= 200 && result.status < 300,
  };
}

/**
 * Health check for n8n webhook
 */
export async function healthCheck(): Promise<boolean> {
  const config = getN8NConfig();

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': config.apiKey,
      },
    });

    return response.ok || response.status === 405; // 405 Method Not Allowed is OK (webhook exists)
  } catch {
    return false;
  }
}
