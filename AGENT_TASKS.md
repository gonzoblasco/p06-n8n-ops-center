# AGENT_TASKS.md — P06 n8n Ops Center

## Estado general

- Fase actual: 1 — MCP Server
- Última task completada: —
- Próxima task: T01

## Contexto del proyecto

Dashboard Next.js para monitorear, ejecutar y debuggear workflows n8n.
Núcleo: servidor MCP HTTP streamable (puerto 3001) que expone la n8n API como tools.
AI feature: análisis de errores de ejecuciones fallidas con claude-sonnet-4-6.

Stack: Next.js 16 · TypeScript · Tailwind · shadcn/ui · Anthropic API · n8n API
n8n base URL: https://n8n.srv920035.hstgr.cloud/api/v1
MCP server: /mcp-server (directorio separado dentro del repo)

---

## FASE 1 — MCP Server custom

### T01 — Scaffold MCP server TypeScript

- Crear `/mcp-server` con su propio `package.json`
- Dependencias: `@modelcontextprotocol/sdk`, `express`, `zod`
- Entry point: `src/index.ts`
- HTTP streamable en puerto 3001
- Auth: leer `N8N_API_KEY` desde env
- Status: [ ] pendiente

### T02 — Tool: list_workflows

- GET /api/v1/workflows
- Devuelve: id, name, active, updatedAt de cada workflow
- Status: [ ] pendiente

### T03 — Tool: get_executions

- GET /api/v1/executions?workflowId={id}&limit=10
- Devuelve: id, status, startedAt, stoppedAt, error (si existe)
- Status: [ ] pendiente

### T04 — Tool: run_workflow

- POST /api/v1/workflows/{id}/run
- Acepta payload opcional
- Status: [ ] pendiente

### T05 — Tool: get_execution_detail

- GET /api/v1/executions/{id}
- Devuelve logs completos + data de cada nodo
- Status: [ ] pendiente

### T06 — Hardening auth + error handling

- Todos los tools validan N8N_API_KEY presente
- Errores de n8n API mapeados a respuestas MCP claras
- Status: [ ] pendiente

---

## FASE 2 — Next.js App

### T07 — Limpieza de p05 + env vars

- Eliminar rutas/componentes específicos de p05 (ingest, chat)
- Crear `.env.local` con N8N_API_KEY y MCP_SERVER_URL
- Crear `.env.example` con placeholders
- Status: [ ] pendiente

### T08 — /dashboard — lista de workflows

- Consume list_workflows via API route que llama al MCP
- Tabla: nombre, estado (activo/inactivo), última actualización
- Status: [ ] pendiente

### T09 — Página de detalle de workflow

- Lista de últimas 10 ejecuciones (get_executions)
- Badge de status por ejecución: success / error / running
- Botón "Ejecutar" → llama run_workflow
- Status: [ ] pendiente

### T10 — Panel de logs de ejecución

- Modal o side panel al clickear una ejecución fallida
- Muestra error message + nodo donde falló
- Botón "Analizar con IA" (se conecta en T12)
- Status: [ ] pendiente

---

## FASE 3 — AI feature

### T11 — API route /api/analyze-error

- Recibe: workflowId, executionId, errorMessage, nodeName
- Llama claude-sonnet-4-6 con el contexto del error
- Devuelve: causa probable + fix sugerido (texto plano, sin markdown headers)
- Status: [ ] pendiente

### T12 — Integración del análisis en el panel de logs

- Botón "Analizar con IA" → llama /api/analyze-error
- Muestra resultado inline en el panel
- Estados: idle / loading / result / error
- Status: [ ] pendiente

---

## FASE 4 — Cierre

### T13 — PR Review

- Invocar @.agents/skills/pr-review/SKILL.md
- Status: [ ] pendiente

### T14 — Skill n8n-workflow + README

- Documentar el patrón MCP HTTP streamable
- Crear .agents/skills/n8n-workflow/SKILL.md
- Status: [ ] pendiente

### T15 — Commit final y cierre

- Conventional commit por fase completada
- Actualizar curriculum map
- Status: [ ] pendiente

---

## Decisiones de arquitectura

- MCP server corre como proceso separado (no embebido en Next.js)
- Next.js se comunica con el MCP via HTTP fetch a localhost:3001
- La n8n API key nunca se expone al frontend — solo el MCP server la usa
- El MCP server es stateless — no persiste nada
