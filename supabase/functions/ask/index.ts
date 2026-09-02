import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_AI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GOOGLE_AI_KEY}`;

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} - ${err}`);
  }
  const data = await res.json();
  return data.embedding.values;
}

async function matchDocuments(
  embedding: number[],
  threshold: number,
  count: number
): Promise<Array<{ id: number; content: string; source: string; similarity: number }>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      query_embedding: `[${embedding.join(",")}]`,
      match_threshold: threshold,
      match_count: count,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC error: ${res.status} - ${err}`);
  }

  return res.json();
}

async function askGemini(question: string, context: string): Promise<string> {
  const messages = [
    {
      role: "system",
      content: `Eres un asistente de un sistema RAG. Responde SOLO con la información del contexto proporcionado. Si la información no está en el contexto, responde exactamente: "No tengo esa información en mis documentos."

CONTEXTO:
${context}`
    },
    {
      role: "user",
      content: question
    }
  ];

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No se pudo generar una respuesta.";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionEmbedding = await getEmbedding(question);

    const matches = await matchDocuments(questionEmbedding, 0.5, 5);

    const context = matches.map((m) => m.content).join("\n\n");

    const answer = await askGemini(question, context || "No hay documentos disponibles.");

    return new Response(
      JSON.stringify({
        answer,
        sources: matches.map((m) => ({
          content: m.content,
          source: m.source,
          similarity: m.similarity,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
