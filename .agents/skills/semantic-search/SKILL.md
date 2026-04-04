# Skill: semantic-search

## Qué hace

Búsqueda semántica sobre una tabla de Supabase usando embeddings de OpenAI
y pgvector. El usuario escribe en lenguaje natural y el sistema retorna los
resultados más similares semánticamente con similarity score.

## Cuándo usarlo

Cuando necesitás buscar por significado, no por texto exacto. Casos de uso:
búsqueda en knowledge bases, clasificación por similitud, recuperación de
contexto para RAG.

## Stack requerido

- openai (text-embedding-3-small)
- pgvector extension en Supabase
- Función SQL `match_<table>` con parámetros: `query_embedding`, `match_threshold`,
  `match_count`, `p_user_id`

## Patrón central

```
query (string)
  → openai.embeddings.create({ model: 'text-embedding-3-small' })
  → vector [1536 dims]
  → supabase.rpc('match_<table>', { query_embedding, match_threshold, match_count, p_user_id })
  → ranked results con similarity score (0.0 - 1.0)
```

## Archivos clave (copiar y adaptar)

- **Schema SQL**: función `match_<table>` — ver `schema.sql` de P04
- **API route**: `app/api/search/route.ts` — sanitización de threshold/limit incluida
- **Server Actions**: `lib/actions/support.ts` — `getItems()` / `getStats()`
- **Componentes UI**: `SemanticDashboard`, `SearchBar`, `ThresholdSlider`, `ResultsTable`

## Schema SQL de referencia

```sql
-- Habilitar pgvector
create extension if not exists vector;

-- Columna en la tabla objetivo
embedding vector(1536)

-- RLS recomendada
alter table public.<table> enable row level security;
create policy "Users can only access their own <items>"
  on public.<table> for all using (auth.uid() = user_id);

-- Función de búsqueda
create or replace function match_<table>(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  -- ... columnas del dominio ...
  similarity float
)
language sql stable
as $$
  select
    id,
    -- ... columnas del dominio ...
    1 - (embedding <=> query_embedding) as similarity
  from <table>
  where user_id = p_user_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

## API route de referencia

```ts
// app/api/search/route.ts
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { query } = body
    const threshold = Math.max(0, Math.min(1, Number(body.threshold) || 0.5))
    const limit = Math.max(1, Math.min(100, Number(body.limit) || 10))

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'La query es requerida' }, { status: 400 })
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Query demasiado larga (max 500 chars)' }, { status: 400 })
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const query_embedding = response.data[0].embedding

    const { data: results, error } = await supabase.rpc('match_<table>', {
      query_embedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: user.id,
    })

    if (error) {
      console.error('Search RPC Error:', error)
      return NextResponse.json({ error: 'Error en la búsqueda semántica' }, { status: 500 })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

## Seed con embeddings (loop secuencial)

```ts
// Procesar de a uno para no exceder rate limits de OpenAI
for (let i = 0; i < items.length; i++) {
  const item = items[i]
  console.log(`Seeding item ${i + 1}/${items.length}...`)

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: item.text,
  })

  itemsWithEmbeddings.push({
    ...item,
    embedding: response.data[0].embedding,
  })
}
```

## Variables de entorno necesarias

```
OPENAI_API_KEY=
```

## Configuración recomendada

| Parámetro | Default | Rango válido | Notas |
|---|---|---|---|
| threshold | 0.5 | 0.0 – 1.0 | 0 = todo pasa, 1 = nada pasa |
| limit | 10 | 1 – 100 | Clamear antes de pasar al RPC |
| model | text-embedding-3-small | — | 1536 dims, balance costo/calidad |

## Warnings

- **Re-indexación obligatoria**: cambiar el modelo de embeddings requiere
  re-vectorizar todos los registros existentes. Las dimensiones deben coincidir
  exactamente con la columna `vector(N)` del schema.
- **Sanitizá siempre** `threshold` (0–1) y `limit` (1–100) antes de pasar al RPC;
  valores fuera de rango pueden causar comportamientos inesperados en pgvector.
- **No usar `Promise.all`** para generar embeddings en batch grande: dispara
  N requests simultáneos a OpenAI y puede exceder los límites de TPM/RPM.
  Usar loop `for...of` secuencial.
- **Nunca exponer `error.message`** de OpenAI al cliente en responses 500;
  puede filtrar información del API key o detalles internos del request.
- **RLS es la última línea de defensa**: siempre pasar `p_user_id` explícitamente
  al RPC aunque RLS esté activa — la política puede cambiar o ser bypasseada
  en migrations futuras.
