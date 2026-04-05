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
const server = new McpServer({
    name: "n8n-ops-center",
    version: "1.0.0",
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
