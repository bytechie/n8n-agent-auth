import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const mcpServer = new McpServer({
  name: "n8n-mcp-gateway",
  version: "1.0.0"
});

// Register tool with zod schema
mcpServer.tool(
  "run_n8n_task",
  "Executes an n8n workflow with the provided data",
  {
    data: z.record(z.string(), z.unknown()).describe("Data to pass to the n8n workflow"),
    workflow: z.string().optional().describe("Optional: Name of the specific workflow to execute")
  },
  async (args) => {
    const { triggerWorkflow } = await import('./n8n');
    const result = await triggerWorkflow(args.data || args);
    return {
      content: [{ type: "text", text: JSON.stringify(result.data) }]
    };
  }
);
