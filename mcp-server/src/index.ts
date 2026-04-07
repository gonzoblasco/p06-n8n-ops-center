import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

const PORT = 3001;

const n8nApiKey = process.env.N8N_API_KEY;
if (!n8nApiKey) {
  console.error("ERROR: N8N_API_KEY environment variable is not defined");
  process.exit(1);
}

const app = express();
app.use(express.json());

const N8N_BASE_URL = "https://n8n.srv920035.hstgr.cloud/api/v1";

const server = new McpServer({
  name: "n8n-ops-center",
  version: "1.0.0",
});

server.tool("list_workflows", "List all workflows from n8n", {}, async () => {
  const response = await fetch(`${N8N_BASE_URL}/workflows`, {
    headers: { "X-N8N-API-KEY": n8nApiKey as string },
  }).catch((err: unknown) => {
    throw new Error(`Network error contacting n8n: ${String(err)}`);
  });

  if (!response.ok) {
    throw new Error(
      `n8n API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    data: { id: string; name: string; active: boolean; updatedAt: string }[];
  };

  const workflows = data.data.map(({ id, name, active, updatedAt }) => ({
    id,
    name,
    active,
    updatedAt,
  }));

  return {
    content: [{ type: "text" as const, text: JSON.stringify(workflows, null, 2) }],
  };
});

server.tool(
  "get_executions",
  "Get executions for a specific n8n workflow",
  {
    workflowId: z.string().describe("The workflow ID to fetch executions for"),
    limit: z.number().optional().default(10).describe("Max number of executions to return"),
  },
  async ({ workflowId, limit }) => {
    const url = `${N8N_BASE_URL}/executions?workflowId=${encodeURIComponent(workflowId)}&limit=${limit}`;

    const response = await fetch(url, {
      headers: { "X-N8N-API-KEY": n8nApiKey as string },
    }).catch((err: unknown) => {
      throw new Error(`Network error contacting n8n: ${String(err)}`);
    });

    if (!response.ok) {
      throw new Error(
        `n8n API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      data: {
        id: string;
        status: string;
        startedAt: string;
        stoppedAt: string | null;
        data?: { resultData?: { error?: { message?: string } } };
      }[];
    };

    const executions = data.data.map(({ id, status, startedAt, stoppedAt, data: execData }) => {
      const entry: Record<string, unknown> = { id, status, startedAt, stoppedAt };
      const error = execData?.resultData?.error;
      if (error) entry.error = error.message ?? String(error);
      return entry;
    });

    return {
      content: [{ type: "text" as const, text: JSON.stringify(executions, null, 2) }],
    };
  }
);

app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log("N8N_API_KEY loaded successfully");
});
