import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MODEL = "claude-sonnet-4-6";
const MATCH_COUNT = 5;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ChunkResult = {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  title: string;
};

function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const query: string = body.query ?? "";
  const documentIds: string[] = Array.isArray(body.document_ids)
    ? body.document_ids
    : [];
  const history: { role: "user" | "assistant"; content: string }[] =
    Array.isArray(body.history) ? body.history : [];

  if (!query.trim()) {
    return NextResponse.json(
      { error: "La query no puede estar vacía" },
      { status: 400 },
    );
  }

  // Embed query
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Retrieve chunks via RPC
  const matchThreshold = parseFloat(process.env.MATCH_THRESHOLD ?? "0.5");
  const { data: chunks, error: rpcError } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: MATCH_COUNT,
      filter_document_ids: documentIds,
    },
  );

  if (rpcError) {
    console.error("match_document_chunks error:", rpcError);
    return NextResponse.json(
      { error: "Error en la búsqueda semántica" },
      { status: 500 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(payload)));
      };

      if (!chunks || chunks.length === 0) {
        send({
          type: "text",
          content:
            "No encontré información relevante en los documentos seleccionados.",
        });
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      // Build system prompt with numbered context
      const contextBlocks = (chunks as ChunkResult[])
        .map((c, i) => {
          const pct = Math.round(c.similarity * 100);
          return `[${i + 1}] (${c.title}, similarity ${pct}%)\n${c.content}`;
        })
        .join("\n\n");

      const systemPrompt = `Sos un asistente que responde preguntas basándose ÚNICAMENTE en el contexto provisto.
No agregues información que no esté en el contexto.
No uses headers markdown (##, ###).
No agregues texto introductorio ni conclusiones genéricas.
Responde de forma directa y concisa.

CONTEXTO:
${contextBlocks}`;

      // Build messages including history
      const messages: Anthropic.MessageParam[] = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: query },
      ];

      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        anthropicStream.on("text", (text) => {
          send({ type: "text", content: text });
        });

        await anthropicStream.finalMessage();

        // Send sources
        const sources = (chunks as ChunkResult[]).map((c) => ({
          chunk_id: c.id,
          document_id: c.document_id,
          title: c.title,
          content_preview: c.content.slice(0, 150),
          similarity: c.similarity,
        }));
        send({ type: "sources", sources });
      } catch (err) {
        console.error("Anthropic streaming error:", err);
        send({ type: "text", content: "Error al generar la respuesta." });
      }

      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
