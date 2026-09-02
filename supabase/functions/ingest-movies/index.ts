import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_AI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GOOGLE_AI_KEY}`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Movie {
  id: string;
  primary_title: string;
  description: string | null;
  start_year: number | null;
  genres: string[] | null;
  average_rating: number | null;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
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

function buildMovieText(movie: Movie): string {
  const parts: string[] = [];

  parts.push(`Película: ${movie.primary_title}`);

  if (movie.start_year) {
    parts.push(`Año: ${movie.start_year}`);
  }

  if (movie.description) {
    parts.push(`Descripción: ${movie.description}`);
  }

  if (movie.genres && movie.genres.length > 0) {
    parts.push(`Géneros: ${movie.genres.join(", ")}`);
  }

  if (movie.average_rating) {
    parts.push(`Calificación: ${movie.average_rating}/10`);
  }

  return parts.join(". ");
}

async function fetchMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/movies?select=id,primary_title,description,start_year,genres,average_rating&embedding=is.null`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fetch movies error: ${res.status} - ${err}`);
  }

  return res.json();
}

async function updateMovieEmbedding(
  movieId: string,
  embedding: number[]
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/movies?id=eq.${movieId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        embedding: `[${embedding.join(",")}]`,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Update embedding error: ${res.status} - ${err}`);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const movies = await fetchMovies();

    if (movies.length === 0) {
      return new Response(
        JSON.stringify({ message: "All movies already have embeddings", processed: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const movie of movies) {
      try {
        const text = buildMovieText(movie);
        const embedding = await getEmbedding(text);
        await updateMovieEmbedding(movie.id, embedding);
        processed++;

        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${movies.length} movies`);
        }
      } catch (error) {
        console.error(`Error processing movie ${movie.id}: ${error}`);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Ingestion complete",
        processed,
        errors,
        total: movies.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});