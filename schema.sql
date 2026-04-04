-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create support_items table
create table if not exists public.support_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  buyer_nickname text not null,
  product_title text not null,
  question_text text not null,
  category text not null check (category in ('envio', 'garantia', 'precio', 'tecnico', 'general')),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'escalated')),
  created_at timestamptz default now(),
  embedding vector(1536) -- Match with text-embedding-3-small
);

-- RLS: User can only see their own items
alter table public.support_items enable row level security;

create policy "Users can only access their own support items"
  on public.support_items
  for all
  using (auth.uid() = user_id);

-- Search function for similarity search
create or replace function match_support_items(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  buyer_nickname text,
  product_title text,
  question_text text,
  category text,
  status text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    id, buyer_nickname, product_title, question_text,
    category, status, created_at,
    1 - (embedding <=> query_embedding) as similarity
  from support_items
  where user_id = p_user_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
