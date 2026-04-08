# Decisiones arquitectónicas — P06 n8n Ops Center

## MCP server como intermediario entre Next.js y n8n

**Decisión:** El dashboard Next.js no llama directamente a la API de n8n. En su lugar, pasa por un MCP server Express en `mcp-server/` que expone tools (`list_workflows`, `get_executions`, etc.).

**Por qué:** Permite que el mismo MCP server sea consumido por otros clientes (Claude Desktop, agentes AI) además del dashboard. Centraliza la autenticación con n8n en un solo lugar.

---

## McpServer instancia por request (no global)

**Decisión:** `createMcpServer()` se llama dentro de cada route handler (`POST /mcp`, `GET /mcp`, `DELETE /mcp`), creando una instancia nueva por request.

**Por qué:** `McpServer` es stateful — mantiene referencia al transport conectado. Compartir una instancia global entre requests causa "Already connected to a transport" en la segunda llamada.

---

## Server Components llaman al MCP directo, no via API route interna

**Decisión:** Los Server Components que necesitan datos del MCP llaman a `MCP_SERVER_URL/mcp` directamente, en lugar de llamar a sus propias API routes via fetch absoluto.

**Por qué:** Los fetch internos en Server Components no llevan las cookies de sesión del usuario. Esto hace que el auth check de Supabase en la API route devuelva 401. Llamando directo al MCP (que no requiere auth de usuario) se evita el problema.

---

## Sin endpoint REST para ejecutar workflows

**Decisión:** El botón "Ejecutar" fue reemplazado por un link directo al editor de n8n (`/workflow/{id}`).

**Por qué:** La n8n REST API no expone un endpoint funcional para disparar workflows con Manual Trigger. El endpoint `POST /api/v1/executions` existe pero requiere configuración específica que no aplica a workflows generales. El link directo es la solución más confiable.

---

## Formato de fechas manual en lugar de toLocaleString

**Decisión:** Las fechas se formatean con template literal manual (`YYYY-MM-DD HH:mm`), no con `Date.toLocaleString()` ni `Intl.DateTimeFormat`.

**Por qué:** `toLocaleString()` produce resultados distintos en Node.js (SSR) y en el browser (CSR), causando hydration mismatch en React. El formato manual es determinístico en ambos entornos.

---

## Análisis de errores via Anthropic API directa (no Anthropic SDK)

**Decisión:** `app/api/analyze-error/route.ts` llama a `https://api.anthropic.com/v1/messages` via `fetch` nativo, no con `@anthropic-ai/sdk`.

**Por qué:** La llamada es simple (un mensaje, respuesta no-streaming) y no justifica la dependencia del SDK. El SDK agrega valor en streaming, retry logic y tipado complejo — ninguno necesario aquí.

---

## Auth check en API routes, no en middleware

**Decisión:** Cada API route que requiere autenticación llama a `createClient().auth.getUser()` al inicio del handler.

**Por qué:** El archivo de middleware en Next.js 16 se llama `proxy.ts`, no `middleware.ts` (breaking change documentado en `.knowledge/architecture.md`). Para evitar confusión y errores silenciosos, el auth check es explícito en cada route.
