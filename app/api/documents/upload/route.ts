import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "text-embedding-3-small";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Se requiere un archivo" },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "md") {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF o MD" },
      { status: 400 },
    );
  }

  const title = file.name.replace(/\.[^.]+$/, "");
  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    if (ext === "pdf") {
      const PDFParser = (await import("pdf2json")).default;
      text = await new Promise<string>((resolve, reject) => {
        const parser = new PDFParser();
        parser.on(
          "pdfParser_dataReady",
          (data: { Pages: { Texts: { R: { T: string }[] }[] }[] }) => {
            const extracted = data.Pages.flatMap((p) => p.Texts).map((t) =>
              t.R.map((r) => {
                try {
                  return decodeURIComponent(r.T);
                } catch {
                  return r.T;
                }
              }).join(""),
            );
            resolve(extracted.join(" "));
          },
        );
        parser.on("pdfParser_dataError", reject);
        parser.parseBuffer(buffer);
      });
    } else {
      text = buffer.toString("utf-8");
    }
  } catch (err) {
    console.error("Text extraction error:", err);
    return NextResponse.json(
      { error: "No se pudo extraer el texto del archivo" },
      { status: 422 },
    );
  }

  const rawChunks = await splitter.createDocuments(
    [text],
    [{ source: file.name }],
  );

  const chunks = rawChunks.map((doc, i) => ({
    content: doc.pageContent,
    metadata: { source: file.name, chunk_index: i },
    chunk_index: i,
  }));

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      file_type: ext,
      file_size: file.size,
      status: "processing",
    })
    .select("id")
    .single();

  if (docError || !doc) {
    console.error("Document insert error:", docError);
    return NextResponse.json(
      { error: "Error al crear el documento" },
      { status: 500 },
    );
  }

  const documentId = doc.id;

  const chunkRows: {
    document_id: string;
    content: string;
    embedding: number[];
    chunk_index: number;
    metadata: object;
  }[] = [];

  for (const chunk of chunks) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk.content,
      });
      chunkRows.push({
        document_id: documentId,
        content: chunk.content,
        embedding: response.data[0].embedding,
        chunk_index: chunk.chunk_index,
        metadata: chunk.metadata,
      });
    } catch (err) {
      console.error(`Embedding failed for chunk ${chunk.chunk_index}:`, err);
    }
  }

  if (chunkRows.length > 0) {
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRows);

    if (chunksError) {
      console.error("Chunks insert error:", chunksError);
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Error al guardar los chunks" },
        { status: 500 },
      );
    }
  }

  const finalStatus = chunkRows.length === 0 ? "error" : "ready";
  await supabase
    .from("documents")
    .update({ status: finalStatus })
    .eq("id", documentId);

  return NextResponse.json({
    document_id: documentId,
    chunk_count: chunkRows.length,
    status: finalStatus,
  });
}
