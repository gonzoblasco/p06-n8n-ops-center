-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: documents
CREATE TABLE documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  file_type   text        NOT NULL CHECK (file_type IN ('pdf', 'md')),
  file_size   integer,
  status      text        NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Table: document_chunks
CREATE TABLE document_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  embedding    vector(1536),
  chunk_index  integer     NOT NULL,
  metadata     jsonb       DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for similarity search (HNSW with cosine distance)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- RLS: documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (user_id = auth.uid());

-- RLS: document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their own documents"
  ON document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
        AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks into their own documents"
  ON document_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
        AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of their own documents"
  ON document_chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_chunks.document_id
        AND documents.user_id = auth.uid()
    )
  );

-- RPC: match_document_chunks
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
  similarity  float,
  title       text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    d.user_id = auth.uid()
    AND (
      array_length(filter_document_ids, 1) IS NULL
      OR dc.document_id = ANY(filter_document_ids)
    )
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
