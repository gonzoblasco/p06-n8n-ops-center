# Architecture

## Stack

- Next.js 16 App Router + TypeScript
- Supabase (Auth, Postgres, RLS)
- Tailwind + shadcn/ui
- Server Actions para mutations

## Estructura

- /app/(auth)/ — rutas públicas
- /app/(dashboard)/ — rutas protegidas
- /lib/supabase/ — cliente server y browser
- /lib/actions/ — mutations

## Notas de versión

- Next.js 16: el archivo de middleware se llama `proxy.ts` (no `middleware.ts`)

## P03 — AI Writing Studio

- Streaming: /api/ai/generate con @anthropic-ai/sdk
- Auth check en API routes: createClient().auth.getUser() antes de procesar
- Model: claude-sonnet-4-6 (constante MODEL en route.ts)
- Historial de versiones: in-memory con useState, no persistido

## P04 — Semantic Dashboard

- Embeddings: OpenAI text-embedding-3-small, vector(1536)
- Tabla: support_items con columna embedding
- RPC: match_support_items (query_embedding, match_threshold, match_count)
- Similarity search: cosine distance via pgvector

## P05 — Docs Chat

- RAG pipeline: ingest → chunk → embed → store → retrieve → generate
- Tablas: documents, document_chunks (embedding vector(1536))
- Chunking: RecursiveCharacterTextSplitter, chunk_size=1000, overlap=200
- Embeddings: OpenAI text-embedding-3-small (misma key que P04)
- Generation: claude-sonnet-4-6 con contexto de chunks
- Streaming: SSE via @anthropic-ai/sdk (patrón P03)
- RPC: match_document_chunks(query_embedding, match_threshold, match_count, document_ids)
- Threshold default: 0.7 (configurable via MATCH_THRESHOLD env var)
- Source attribution: cada respuesta incluye chunks usados con similarity score
- Rutas protegidas: /app/(dashboard)/documents/ y /app/(dashboard)/chat/
- Auth check en API routes: createClient().auth.getUser() antes de procesar
