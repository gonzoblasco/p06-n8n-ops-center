# AGENT_TASKS — P05 Docs Chat

## Contexto

Pipeline RAG completo: ingest → chunk → embed → store → retrieve → generate.
Cada respuesta muestra fuentes con fragmentos exactos y similarity score.

Stack: Next.js 16, Supabase pgvector, OpenAI text-embedding-3-small, Anthropic claude-sonnet-4-6, pdf-parse, LangChain.

---

## FASE 1 — Database schema

### TASK-01: Migración Supabase — tablas documents y document_chunks

**Contexto:** Necesitamos dos tablas. `documents` guarda metadata del archivo original. `document_chunks` guarda los fragmentos con su embedding.

**Instrucciones para el agente:**

1. Leer `.knowledge/conventions.md` antes de empezar
2. Crear migración en `supabase/migrations/`
3. Crear tabla `documents` con campos: id, user_id, title, file_type, file_size, status, created_at
4. Crear tabla `document_chunks` con campos: id, document_id, content, embedding vector(1536), chunk_index, metadata jsonb, created_at
5. Crear función RPC `match_document_chunks(query_embedding vector, match_threshold float, match_count int, document_ids uuid[])` para similarity search
6. Aplicar RLS: user solo ve sus propios documents y chunks
7. Verificar con Supabase MCP que la migración aplicó correctamente

**Criterios de aceptación:**

- [ ] Tablas creadas con tipos correctos
- [ ] RLS activo en ambas tablas
- [ ] Función RPC retorna chunks ordenados por similitud
- [ ] Index en embedding column (ivfflat o hnsw)

---

## FASE 2 — Ingestion pipeline

### TASK-02: API route POST /api/documents/upload

**Contexto:** Recibe un archivo PDF o MD, extrae texto, chunquea, embeds y guarda en Supabase.

**Instrucciones para el agente:**

1. Crear `src/app/api/documents/upload/route.ts`
2. Parsear form-data con el archivo
3. Extraer texto: usar `pdf-parse` para PDF, leer directo para MD
4. Chunking con LangChain `RecursiveCharacterTextSplitter`: chunk_size=1000, chunk_overlap=200
5. Para cada chunk: generar embedding con OpenAI `text-embedding-3-small`
6. Guardar documento en tabla `documents` con status='processing' → luego 'ready'
7. Guardar chunks en tabla `document_chunks` con embedding y metadata (page_number si aplica)
8. Manejar errores: si falla el embedding de un chunk, loguear y continuar
9. Retornar `{ document_id, chunk_count, status }`

**Criterios de aceptación:**

- [ ] PDF de 10 páginas se procesa sin error
- [ ] Chunks guardados con embeddings válidos (vector de 1536 floats)
- [ ] Status del documento se actualiza a 'ready' al terminar
- [ ] Error handling no rompe el proceso completo por un chunk fallido

---

### TASK-03: API route GET /api/documents

**Contexto:** Lista los documentos del usuario con metadata básica.

**Instrucciones para el agente:**

1. Crear `src/app/api/documents/route.ts`
2. Consultar tabla `documents` filtrando por user_id del session
3. Retornar array con: id, title, file_type, status, chunk_count (count de document_chunks), created_at
4. Ordenar por created_at DESC

**Criterios de aceptación:**

- [ ] Solo retorna documentos del usuario autenticado
- [ ] chunk_count es correcto

---

### TASK-04: API route DELETE /api/documents/[id]

**Instrucciones para el agente:**

1. Verificar ownership (document.user_id === session.user.id)
2. Eliminar document_chunks asociados
3. Eliminar document
4. Retornar 204

**Criterios de aceptación:**

- [ ] No puede eliminar documentos de otro usuario (retorna 403)
- [ ] Chunks se eliminan en cascada o explícitamente

---

## FASE 3 — Retrieval + Generation

### TASK-05: API route POST /api/chat

**Contexto:** Recibe query del usuario + lista de document_ids seleccionados. Hace retrieval y genera respuesta con fuentes.

**Instrucciones para el agente:**

1. Crear `src/app/api/chat/route.ts`
2. Recibir: `{ query: string, document_ids: string[], history: Message[] }`
3. Embeds la query con `text-embedding-3-small`
4. Llamar RPC `match_document_chunks` con threshold=0.7, count=5, document_ids
5. Construir system prompt con los chunks como contexto
6. El system prompt debe indicar explícitamente: no agregar headers markdown, no texto introductorio, responder basado SOLO en el contexto provisto
7. Llamar Anthropic SDK con streaming habilitado
8. En la respuesta incluir: stream del texto + sources array `[{ chunk_id, content_preview, similarity_score, document_title }]`
9. Usar SSE para streaming (patrón del P03)

**Criterios de aceptación:**

- [ ] Respuesta llega en streaming
- [ ] Sources array incluye los chunks usados con su score
- [ ] Si no hay chunks relevantes (todos bajo threshold), responde "No encontré información relevante en los documentos seleccionados"
- [ ] History se incluye en el contexto para multi-turn

---

## FASE 4 — UI

### TASK-06: Página /dashboard/documents — gestión de documentos

**Instrucciones para el agente:**

1. Crear `src/app/dashboard/documents/page.tsx`
2. Lista de documentos con: título, tipo, estado (badge), chunk count, fecha, botón eliminar
3. Componente de upload: drag & drop o file picker, acepta PDF y MD únicamente
4. Progress indicator durante el procesamiento
5. Estado vacío con call to action claro

**Criterios de aceptación:**

- [ ] Upload funciona para PDF y MD
- [ ] Estado 'processing' se refleja en la UI
- [ ] Eliminar documento actualiza la lista

---

### TASK-07: Página /dashboard/chat — interfaz de chat con RAG

**Instrucciones para el agente:**

1. Crear `src/app/dashboard/chat/page.tsx`
2. Sidebar izquierdo: lista de documentos con checkboxes para seleccionar cuáles usar
3. Área principal: chat interface con historial
4. Cada respuesta del asistente muestra debajo: sección colapsable "Fuentes" con fragmentos y score
5. Score mostrado como porcentaje (similarity \* 100) con color: verde >80%, amarillo 60-80%, gris <60%
6. Input con envío por Enter o botón
7. Skeleton loader mientras llega la respuesta

**Criterios de aceptación:**

- [ ] Streaming visible en tiempo real
- [ ] Fuentes expandibles por respuesta
- [ ] Selección de documentos persiste durante la sesión
- [ ] Al menos un documento debe estar seleccionado para poder enviar

---

## FASE 5 — Skill + Review

### TASK-08: Crear skill rag-pipeline

**Instrucciones para el agente:**

1. Crear `.agents/skills/rag-pipeline/SKILL.md`
2. El skill debe documentar: estrategia de chunking elegida y por qué, threshold de similarity recomendado, patrón de system prompt para RAG, estructura de la respuesta con sources

**Criterios de aceptación:**

- [ ] Skill invocable con contexto: "implementar RAG pipeline"
- [ ] Incluye decisiones y tradeoffs, no solo pasos

---

### TASK-09: PR Review

```
@.agents/skills/pr-review/SKILL.md
Revisar P05 completo antes del commit final.
Foco: ownership checks en todas las API routes, manejo de errores en embedding pipeline, threshold de similarity configurable via env var.
```

---

## Orden de ejecución

```
TASK-01 → TASK-02 → TASK-03 → TASK-04 → TASK-05 → TASK-06 → TASK-07 → TASK-08 → TASK-09
```

Cada task = un commit en Conventional Commits format.
No avanzar a la siguiente sin que los criterios de aceptación estén cumplidos.
