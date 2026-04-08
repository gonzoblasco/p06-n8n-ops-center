---
name: n8n-workflow
description: Usar cuando se trabaja con la n8n API, se diseñan workflows n8n, 
se implementa un MCP server que wrappea la n8n API, o se debuggean ejecuciones fallidas.
---

# Skill: n8n-workflow

## n8n API — endpoints confirmados

Base URL: https://{instancia}/api/v1
Auth header: X-N8N-API-KEY

| Operación | Método | Endpoint |
|-----------|--------|----------|
| Listar workflows | GET | /workflows?limit=250 |
| Obtener workflow | GET | /workflows/{id} |
| Listar ejecuciones | GET | /executions?workflowId={id}&limit=10 |
| Obtener ejecución | GET | /executions/{id} |

⚠️ No existe endpoint para ejecutar workflows via REST API.
El workaround es link directo al editor: {instancia}/workflow/{id}

## MCP Server HTTP Streamable — patrones críticos

### McpServer es stateful — instancia por request
```typescript
// ❌ MAL: instancia global compartida
const server = new McpServer(...)
app.post('/mcp', async (req, res) => {
  await server.connect(transport) // falla en la segunda request
})

// ✅ BIEN: instancia por request
function createMcpServer() {
  const server = new McpServer(...)
  // registrar tools...
  return server
}
app.post('/mcp', async (req, res) => {
  const server = createMcpServer()
  await server.connect(transport)
})
```

### Colisión de tipos fetch vs Express
```typescript
// fetch() devuelve Response global, Express también tiene Response
// Solución: type alias explícito
type FetchResponse = Awaited<ReturnType<typeof fetch>>

async function n8nFetch(path: string, options: RequestInit = {}): Promise<FetchResponse> {
  // ...
}
```

### SSE response — header requerido
El MCP SDK HTTP streamable requiere:
```
Accept: application/json, text/event-stream
```
Sin este header devuelve 406.

### Parsear respuesta SSE en Next.js API routes
```typescript
const text = await response.text()
let mcpResult: unknown
for (const line of text.split('\n')) {
  if (line.startsWith('data: ')) {
    try { mcpResult = JSON.parse(line.slice(6)); break } catch { /* skip */ }
  }
}
// fallback a JSON plain si no hay SSE
if (!mcpResult) {
  try { mcpResult = JSON.parse(text) } catch { return null }
}
```

## Hydration mismatch — fechas en App Router

`toLocaleString()` produce resultados distintos en SSR vs cliente.
Usar formato manual consistente:
```typescript
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
```

## Patrón: Server Component → MCP directo (evitar cookie problem)

Cuando un Server Component necesita datos del MCP, llamar directo 
al MCP server — NO via API route interna. Los fetch internos no 
llevan cookies de sesión y el auth check falla con 401.

```typescript
// ✅ En Server Component: llamar MCP directo
const MCP_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001'
const response = await fetch(`${MCP_URL}/mcp`, { ... })

// ❌ Fetch interno a API route propia desde Server Component
const res = await fetch(`http://localhost:3000/api/mi-route`) // 401
```

## Variables de entorno requeridas

```
N8N_API_KEY=           # JWT de la instancia n8n
MCP_SERVER_URL=http://localhost:3001
ANTHROPIC_API_KEY=     # Para análisis de errores con IA
```
