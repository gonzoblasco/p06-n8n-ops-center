import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
const PORT = 3001;
const n8nApiKey = process.env.N8N_API_KEY;
if (!n8nApiKey) {
    console.error("ERROR: N8N_API_KEY environment variable is not defined");
    process.exit(1);
}
const N8N_BASE_URL = "https://n8n.srv920035.hstgr.cloud/api/v1";
async function n8nFetch(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("X-N8N-API-KEY", n8nApiKey);
    return fetch(`${N8N_BASE_URL}${path}`, { ...options, headers }).catch((err) => {
        throw new Error(`Network error contacting n8n: ${String(err)}`);
    });
}
async function assertOk(response) {
    if (!response.ok) {
        throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }
}
const app = express();
app.use(express.json());
const server = new McpServer({
    name: "n8n-ops-center",
    version: "1.0.0",
});
server.tool("list_workflows", "List all workflows from n8n", {}, async () => {
    const response = await n8nFetch("/workflows");
    await assertOk(response);
    const data = (await response.json());
    const workflows = data.data.map(({ id, name, active, updatedAt }) => ({
        id,
        name,
        active,
        updatedAt,
    }));
    return {
        content: [{ type: "text", text: JSON.stringify(workflows, null, 2) }],
    };
});
server.tool("get_executions", "Get executions for a specific n8n workflow", {
    workflowId: z.string().describe("The workflow ID to fetch executions for"),
    limit: z.number().optional().default(10).describe("Max number of executions to return"),
}, async ({ workflowId, limit }) => {
    const response = await n8nFetch(`/executions?workflowId=${encodeURIComponent(workflowId)}&limit=${limit}`);
    await assertOk(response);
    const data = (await response.json());
    const executions = data.data.map(({ id, status, startedAt, stoppedAt, data: execData }) => {
        const entry = { id, status, startedAt, stoppedAt };
        const error = execData?.resultData?.error;
        if (error)
            entry.error = error.message ?? String(error);
        return entry;
    });
    return {
        content: [{ type: "text", text: JSON.stringify(executions, null, 2) }],
    };
});
server.tool("run_workflow", "Trigger a run of a specific n8n workflow", {
    workflowId: z.string().describe("The workflow ID to run"),
    payload: z
        .string()
        .optional()
        .default("{}")
        .describe("JSON-stringified object to send as the request body"),
}, async ({ workflowId, payload }) => {
    let body;
    try {
        body = JSON.parse(payload);
    }
    catch {
        throw new Error(`Invalid JSON payload: ${payload}`);
    }
    const response = await n8nFetch(`/workflows/${encodeURIComponent(workflowId)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    await assertOk(response);
    const data = (await response.json());
    const executionId = data.executionId ?? data.data?.executionId ?? null;
    const status = data.status ?? data.data?.status ?? "unknown";
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ executionId, status }, null, 2),
            },
        ],
    };
});
server.tool("get_execution_detail", "Get full details of a specific n8n execution", {
    executionId: z.string().describe("The execution ID to retrieve"),
}, async ({ executionId }) => {
    const response = await n8nFetch(`/executions/${encodeURIComponent(executionId)}`);
    await assertOk(response);
    const data = (await response.json());
    const result = {
        id: data.id,
        status: data.status,
        startedAt: data.startedAt,
        stoppedAt: data.stoppedAt,
        mode: data.mode,
    };
    const error = data.data?.resultData?.error;
    if (error) {
        result.error = {
            message: error.message ?? String(error),
            nodeName: error.node?.name ?? null,
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
});
// Global error handler — logs unhandled errors before Express/SDK processes them
app.use((err, _req, res, _next) => {
    console.error("[MCP server error]", err);
    res.status(500).json({ error: "Internal server error" });
});
app.post("/mcp", async (req, res, next) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on("close", () => {
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (err) {
        console.error("[MCP POST /mcp error]", err);
        next(err);
    }
});
app.get("/mcp", async (req, res, next) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on("close", () => {
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
    }
    catch (err) {
        console.error("[MCP GET /mcp error]", err);
        next(err);
    }
});
app.delete("/mcp", async (req, res, next) => {
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on("close", () => {
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
    }
    catch (err) {
        console.error("[MCP DELETE /mcp error]", err);
        next(err);
    }
});
app.listen(PORT, () => {
    console.log(`MCP server running on http://localhost:${PORT}`);
    console.log("N8N_API_KEY loaded successfully");
});
