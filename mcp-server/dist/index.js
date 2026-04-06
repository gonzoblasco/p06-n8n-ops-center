import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
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
        headers: { "X-N8N-API-KEY": n8nApiKey },
    }).catch((err) => {
        throw new Error(`Network error contacting n8n: ${String(err)}`);
    });
    if (!response.ok) {
        throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }
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
app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    res.on("close", () => {
        transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});
app.get("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    res.on("close", () => {
        transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
});
app.delete("/mcp", async (req, res) => {
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
