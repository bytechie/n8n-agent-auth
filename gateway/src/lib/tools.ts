/**
 * MCP Tool Definitions
 * Defines available tools that AI agents can call
 */

import type { Tool } from '@/types/mcp';

/**
 * Generic input schema for n8n workflows
 */
const genericInputSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      description: 'Data to pass to the n8n workflow',
      additionalProperties: true,
    },
    workflow: {
      type: 'string',
      description: 'Optional: Name of the specific workflow to execute',
    },
  },
};

/**
 * Execute n8n task tool
 * Triggers an n8n workflow with the provided data
 */
export const runN8NTaskTool: Tool = {
  name: 'run_n8n_task',
  description: 'Executes an n8n workflow with the provided data. This tool can trigger various automation tasks such as sending notifications, processing data, calling external APIs, and more.',
  inputSchema: genericInputSchema,
};

/**
 * Available tools registry
 * Add more tools here as needed
 */
export const availableTools: Tool[] = [
  runN8NTaskTool,
];

/**
 * Get tool by name
 */
export function getTool(name: string): Tool | undefined {
  return availableTools.find((tool) => tool.name === name);
}

/**
 * Tool execution handlers
 */
export interface ToolHandler {
  (args: Record<string, unknown>): Promise<{
    content: unknown;
    isSuccess: boolean;
    error?: string;
  }>;
}

/**
 * Registry of tool execution handlers
 */
export const toolHandlers: Record<string, ToolHandler> = {
  run_n8n_task: async (args) => {
    const { triggerWorkflow } = await import('./n8n');

    try {
      // Extract data from arguments
      const data = (args.data as Record<string, unknown>) || args;

      // Trigger the workflow
      const result = await triggerWorkflow(data);

      return {
        content: result.data,
        isSuccess: true,
      };
    } catch (error) {
      return {
        content: null,
        isSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{
  content: unknown;
  isSuccess: boolean;
  error?: string;
}> {
  const handler = toolHandlers[name];

  if (!handler) {
    return {
      content: null,
      isSuccess: false,
      error: `Tool "${name}" not found`,
    };
  }

  return handler(args);
}
