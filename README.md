# P05 — Docs Chat

Chat sobre tus propios documentos con fuentes visibles y score de confianza.

## ¿Qué hace?

Cargás PDFs o archivos Markdown, el sistema los procesa en chunks, los vectoriza y los almacena. Luego podés chatear sobre el contenido: cada respuesta muestra los fragmentos exactos que la respaldan y su score de similitud.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase + pgvector (similarity search)
- OpenAI text-embedding-3-small (embeddings)
- Anthropic claude-sonnet-4-6 (generación)
- pdf-parse + LangChain (ingestion y chunking)

## Pipeline RAG

1. **Ingest** — upload de PDF/MD, extracción de texto limpio
2. **Chunk** — división en fragmentos con overlap y metadata de origen
3. **Embed** — vectorización de cada chunk con text-embedding-3-small
4. **Store** — guardado en Supabase pgvector
5. **Retrieve** — query → embedding → similarity search → top-k chunks
6. **Generate** — claude-sonnet-4-6 con contexto de chunks + source attribution

## Desarrollo

```bash
npm run dev      # servidor en localhost:3000
npm run test     # vitest
npm run build    # build de producción
```

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Currículum

Proyecto 05 del Full Stack AI Developer curriculum. Fase 3: RAG y pipelines de conocimiento.
