# P06 — n8n Ops Center

Dashboard para monitorear y operar workflows de n8n, con análisis de errores via IA.

## ¿Qué hace?

- Lista todos los workflows de tu instancia n8n
- Muestra ejecuciones recientes con estado (exitoso / error / en curso)
- Detalle de ejecución: duración, nodo que falló, mensaje de error
- Análisis de errores con IA: explica la causa probable y sugiere el fix
- Link directo al editor de n8n para ejecutar o editar workflows

## Stack

- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Auth)
- MCP server Express (`mcp-server/`) — intermediario entre el dashboard y n8n
- Anthropic claude-sonnet-4-6 (análisis de errores)

## Setup

### 1. Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# n8n
N8N_API_KEY=              # Settings → API → Create API Key en tu instancia n8n

# MCP server (URL donde corre el servidor Express)
MCP_SERVER_URL=http://localhost:3001

# IA
ANTHROPIC_API_KEY=
```

### 2. Instalar dependencias

```bash
# Dashboard
npm install

# MCP server
cd mcp-server && npm install
```

### 3. Levantar el MCP server

El MCP server es un proceso Express separado que conecta con la API de n8n.
Debe estar corriendo para que el dashboard funcione.

```bash
cd mcp-server
npm run dev     # desarrollo con watch
# o
npm run build && npm start   # producción
```

Corre en `http://localhost:3001` por defecto.

### 4. Levantar el dashboard

```bash
npm run dev
```

Abre `http://localhost:3000`. Requiere una cuenta en Supabase configurada para auth.

## Arquitectura

```
Browser → Next.js (3000) → MCP Server Express (3001) → n8n API
                         ↘ Anthropic API (analyze-error)
```

Los Server Components llaman al MCP server directamente (no via API routes internas)
para evitar problemas de cookies en fetch interno. Ver `.knowledge/decisions.md`.

## Desarrollo

```bash
npm run dev      # Next.js en localhost:3000
npm run build    # build de producción
npm run lint     # ESLint
```

## Currículum

Proyecto 06 del Full Stack AI Developer curriculum. Integración con herramientas externas via MCP + análisis con IA.
