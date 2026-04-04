@AGENTS.md

## Proyecto

Docs Chat — chat sobre documentos propios (PDF/MD) con fuentes visibles y score de confianza.

## AI Feature

- text-embedding-3-small (OpenAI) para vectorizar chunks de documentos
- pgvector en Supabase para similarity search (cosine)
- Pipeline completo: ingest → chunk → embed → store → retrieve → generate
- Source attribution: cada respuesta muestra fragmentos exactos y similarity score
- Anthropic SDK (claude-sonnet-4-6) para generación con contexto RAG

## Stack nuevo (respecto al scaffold)

- pdf-parse para extracción de texto desde PDFs
- langchain + @langchain/openai para chunking y embedding pipeline
- Nueva tabla `documents` y `document_chunks` con columna embedding vector(1536)

## Model

Default: claude-sonnet-4-6, effort: medium
