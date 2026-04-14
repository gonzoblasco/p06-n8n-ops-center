@AGENTS.md

## Proyecto

n8n Ops Center — Dashboard para monitoreo y debugging inteligente de workflows n8n mediante MCP.

## AI Feature

- Integración con Anthropic API para análisis de errores en ejecuciones de workflows.
- Uso de **Claude Sonnet 4.6** para interpretar mensajes de error y sugerir soluciones.
- Contexto de ejecución: workflowId, executionId, nodeName y errorMessage.
- Formato de respuesta: Causa probable + Fix sugerido (texto plano).

## Stack

- Next.js 15 (App Router) + TypeScript.
- MCP Server (Express) actuando como proxy para la n8n API.
- Supabase Auth (SSR) para protección de rutas.
- Tailwind CSS + shadcn/ui para la interfaz.

## Model

Default: claude-sonnet-4-6, effort: medium
