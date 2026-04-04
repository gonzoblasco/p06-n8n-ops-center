---
name: rag-pipeline
description: Decisiones de diseño del pipeline RAG de P05 (Docs Chat) — reutilizable en proyectos futuros con búsqueda semántica sobre documentos propios.
---

# RAG Pipeline — Decisiones de diseño (P05 Docs Chat)

## 1. Chunking: RecursiveCharacterTextSplitter

**Parámetros usados:**
```ts
chunk_size: 1000,    // caracteres
chunk_overlap: 200,  // solapamiento entre chunks
```

**Por qué estos valores:**
- `chunk_size=1000` cabe cómodamente en el context window del embedding (text-embedding-3-small soporta hasta 8191 tokens). A 4 chars/token promedio, 1000 chars ≈ 250 tokens — suficiente para capturar un párrafo completo con contexto.
- `chunk_overlap=200` (20%) evita que una idea que cruza el límite de dos chunks quede sin representación semántica en ninguno. Sin overlap, las ideas en el borde se pierden.
- `RecursiveCharacterTextSplitter` respeta límites naturales del texto (párrafos → oraciones → palabras) antes de cortar arbitrariamente. Produce chunks más coherentes que un splitter por longitud fija.

**Ajustes según caso de uso:**
- Documentos técnicos con párrafos largos: subir a `chunk_size=1500`.
- FAQs o listas: bajar a `chunk_size=500` para que cada item sea un chunk independiente.
- Si los documentos tienen mucha repetición: reducir `chunk_overlap=100`.

**Metadata por chunk:**
```ts
{ source: filename, chunk_index: number }
```
Guardada en columna `metadata jsonb` — permite filtrar por archivo origen en el futuro.

---

## 2. Modelo de embeddings: text-embedding-3-small

**Dimensión:** 1536 (vector(1536) en pgvector)

**Por qué text-embedding-3-small y no large:**
| Modelo | Dimensión | Costo relativo | MTEB score |
|---|---|---|---|
| text-embedding-3-small | 1536 | 1x | ~62% |
| text-embedding-3-large | 3072 | 13x | ~64% |

- Diferencia de calidad: ~2 puntos en benchmark. Diferencia de costo: 13x.
- Para RAG sobre documentos propios (dominio acotado), small es suficiente.
- Misma key de OpenAI que P04 (soporte ML), reutilización directa.

**Si en el futuro se necesita más precisión:** migrar a large implica re-embeddear todos los chunks y cambiar `vector(1536)` a `vector(3072)`.

---

## 3. Similarity threshold: 0.7 (cosine)

**Configuración:**
```ts
const matchThreshold = parseFloat(process.env.MATCH_THRESHOLD ?? '0.7')
```

**Escala de referencia (cosine similarity):**
- `>= 0.9` — casi idéntico semánticamente
- `0.7–0.9` — alta similitud, respuesta relevante
- `0.5–0.7` — relacionado pero puede traer ruido
- `< 0.5` — probablemente irrelevante

**Qué pasa si es muy alto (>0.85):**
- Se devuelven pocos o ningún chunk → el modelo responde "no encontré información relevante" aunque haya chunks útiles con similitud 0.75.
- Útil solo cuando la calidad de los chunks es muy alta y la query es muy precisa.

**Qué pasa si es muy bajo (<0.5):**
- Se devuelven chunks irrelevantes → el modelo "alucina" mezclando contexto incorrecto con la respuesta.
- El system prompt mitiga esto (instrucción de no inventar), pero no elimina el problema.

**Estrategia adaptativa:** exponer `MATCH_THRESHOLD` como env var permite ajustar por dominio sin tocar código. Para SoporteML (FAQs), probar con 0.65.

---

## 4. System prompt RAG

**Estructura del contexto numerado:**
```
[1] (título del documento, similarity 87%)
Contenido del chunk...

[2] (otro documento, similarity 74%)
Contenido...
```

**Template completo:**
```ts
const systemPrompt = `Sos un asistente que responde preguntas basándose ÚNICAMENTE en el contexto provisto.
No agregues información que no esté en el contexto.
No uses headers markdown (##, ###).
No agregues texto introductorio ni conclusiones genéricas.
Responde de forma directa y concisa.

CONTEXTO:
${contextBlocks}`
```

**Decisiones clave del prompt:**
- **"ÚNICAMENTE"** en mayúscula: reduce alucinations en respuestas largas.
- **Sin headers markdown**: evita que el modelo genere estructura que se rompe en el chat UI.
- **Sin texto introductorio**: "Según el contexto provisto..." ocupa tokens sin agregar valor.
- **Numeración `[1]`, `[2]`**: permite que el modelo pueda referenciar fuentes si se quisiera añadir citas inline en el futuro.
- **Similarity como porcentaje**: el modelo puede usar esta señal para ponderar implícitamente los chunks más relevantes.

**Historia de mensajes:** se pasa completa en `messages[]` antes del `{ role: 'user', content: query }` actual, permitiendo conversación multi-turno sobre los mismos documentos.

---

## 5. Patrón SSE para streaming con sources

**Formato de eventos:**
```
data: {"type":"text","content":"token..."}
data: {"type":"text","content":" siguiente..."}
data: {"type":"sources","sources":[...]}
data: [DONE]
```

**Orden obligatorio: texto → sources → [DONE]**
- Los tokens de texto llegan primero (streaming visible al usuario).
- Sources se envían una vez que `anthropicStream.finalMessage()` resuelve — garantiza que el texto esté completo antes de mostrar fuentes.
- `[DONE]` cierra la conexión SSE.

**Implementación en Next.js Route Handler:**
```ts
// NO usar NextResponse — no soporta streaming limpio
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
})
```

**Parsing en el cliente:**
```ts
// Buffer necesario para chunks de reader que pueden cortar líneas a mitad
let buffer = ''
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''           // la última línea puede estar incompleta
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    // parsear event...
  }
}
```

**Por qué buffer:** `reader.read()` puede devolver chunks que cortan una línea SSE a la mitad. Sin buffer, el `JSON.parse` falla silenciosamente y se pierden tokens.

---

## 6. Schema de tablas

```sql
-- Documentos subidos por el usuario
CREATE TABLE documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  file_type  text NOT NULL CHECK (file_type IN ('pdf', 'md')),
  file_size  integer,
  status     text NOT NULL DEFAULT 'processing'
             CHECK (status IN ('processing', 'ready', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chunks con embedding
CREATE TABLE document_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(1536),
  chunk_index integer NOT NULL,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice HNSW para búsqueda aproximada (más rápido que IVFFlat para inserciones frecuentes)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

**RLS en document_chunks:** no filtra por `user_id` directamente (la tabla no lo tiene), sino via JOIN a `documents`:
```sql
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_chunks.document_id
      AND documents.user_id = auth.uid()
  )
)
```

**Por qué status en documents:** permite mostrar estado de procesamiento en la UI mientras el pipeline de ingestion corre. `processing → ready` en happy path, `error` si todos los embeddings fallan.

---

## 7. RPC match_document_chunks

```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding     vector(1536),
  match_threshold     float,
  match_count         int,
  filter_document_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id          uuid,
  document_id uuid,
  content     text,
  metadata    jsonb,
  similarity  float,    -- 1 - cosine_distance (1 = idéntico)
  title       text      -- join con documents
)
LANGUAGE sql STABLE
AS $$
  SELECT dc.id, dc.document_id, dc.content, dc.metadata,
         1 - (dc.embedding <=> query_embedding) AS similarity,
         d.title
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    d.user_id = auth.uid()                         -- RLS implícita en la función
    AND (
      array_length(filter_document_ids, 1) IS NULL  -- array vacío → todos los docs
      OR dc.document_id = ANY(filter_document_ids)
    )
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding         -- ASC = más similar primero
  LIMIT match_count;
$$;
```

**Decisiones de diseño:**
- `auth.uid()` dentro de la función: el filtro de usuario opera en SQL, no en la aplicación. Imposible bypassear con un JWT de otro usuario.
- `array_length(filter_document_ids, 1) IS NULL`: en Postgres, `array_length('{}', 1)` retorna NULL (no 0). Esta es la forma correcta de detectar array vacío.
- `ORDER BY embedding <=> query_embedding` (distancia, ASC) en lugar de `ORDER BY similarity DESC`: equivalente pero usa el índice HNSW directamente — más eficiente.
- `LANGUAGE sql STABLE`: el planner puede optimizar mejor que `PLPGSQL` para queries de solo lectura.

**Reutilización en SoporteML:** renombrar a `match_support_items` y ajustar las columnas retornadas. El patrón de `filter_document_ids` equivale a `p_user_id` en P04, pero más flexible (filtra por subconjunto de docs, no solo por usuario).