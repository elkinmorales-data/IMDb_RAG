import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_AI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GOOGLE_AI_KEY}`;

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Filters {
  yearMin?: number;
  yearMax?: number;
  genres?: string[];
  minRating?: number;
  sortBy?: string;
  useLocationEmbedding?: boolean;
  filterCountries?: string[];
  contentRating?: string;
  minVotes?: number;
  filterCountriesOfOrigin?: string[];
  minGross?: number;
  minDuration?: number;
  maxDuration?: number;
}

interface MovieResult {
  id: string;
  primary_title: string;
  description: string;
  start_year: number;
  genres: string[];
  average_rating: number;
  content_rating: string;
  url: string;
  trailer: string;
  runtime_minutes: number;
  filming_locations: string[];
  similarity: number;
}

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

async function searchMoviesHybrid(
  embedding: number[],
  filters: Filters,
  matchCount: number
): Promise<MovieResult[]> {
  const params: Record<string, unknown> = {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: 0.3,
    match_count: matchCount,
    filter_year_min: filters.yearMin || null,
    filter_year_max: filters.yearMax || null,
    filter_genres: filters.genres || null,
    filter_min_rating: filters.minRating || null,
    sort_by: filters.sortBy || null,
    use_location_embedding: filters.useLocationEmbedding || false,
    filter_countries: filters.filterCountries || null,
    filter_content_rating: filters.contentRating || null,
    filter_min_votes: filters.minVotes || null,
    filter_countries_of_origin: filters.filterCountriesOfOrigin || null,
    filter_min_gross: filters.minGross || null,
    filter_min_duration: filters.minDuration || null,
    filter_max_duration: filters.maxDuration || null,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_movies_hybrid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC error: ${res.status} - ${err}`);
  }

  return res.json();
}

function detectFiltersFromQuestion(question: string): Filters {
  const lower = question.toLowerCase();
  const filters: Filters = {};

  // Detect rating keywords with actual numeric parsing
  const ratingKeywords = lower.includes("rating") || lower.includes("calificación") || lower.includes("puntuación") || lower.includes("calificacion");
  const highRatingKeywords = lower.includes("mayor") || lower.includes("alto") || lower.includes("mejor") || lower.includes("superior") || lower.includes("mayores");

  if (ratingKeywords || (highRatingKeywords && lower.includes("pelicula"))) {
    // Try to extract actual number: "mayor a 8.5", "rating > 8.5", "de al menos 8", etc.
    const ratingPatterns = [
      /(?:mayor|alto|superior|mejor)\s+(?:a|que|de)\s+(\d+(?:\.\d+)?)/,
      /(?:rating|calificación|puntuación|calificacion)\s*(?:>|mayor a|mayor que|mayor de|de al menos|de más de|>=?)\s*(\d+(?:\.\d+)?)/,
      /(?:de|con)\s+(?:al menos|más de|mayor a|mayor de|mayores de)\s+(\d+(?:\.\d+)?)/,
      /(?:>=?|>)\s*(\d+(?:\.\d+)?)/,
    ];

    let parsedRating: number | null = null;
    for (const pattern of ratingPatterns) {
      const match = lower.match(pattern);
      if (match) {
        const num = parseFloat(match[1]);
        if (num >= 0 && num <= 10) {
          parsedRating = num;
          break;
        }
      }
    }

    // Fallback: if no number found but high-rating intent exists, default to 8.0
    if (parsedRating === null && highRatingKeywords) {
      parsedRating = 8.0;
    }

    if (parsedRating !== null) {
      filters.minRating = parsedRating;
    }
  }

  // Detect sort keywords
  if (lower.includes("menor duración") || lower.includes("más corta") || lower.includes("más cortas") || lower.includes("duración corta") || lower.includes("poco tiempo")) {
    filters.sortBy = "duration_asc";
  } else if (lower.includes("mayor duración") || lower.includes("más larga") || lower.includes("más largas") || lower.includes("duración larga") || lower.includes("mucho tiempo")) {
    filters.sortBy = "duration_desc";
  } else if (lower.includes("más reciente") || lower.includes("más nueva") || lower.includes("más nuevas") || lower.includes("últimas")) {
    filters.sortBy = "year_desc";
  } else if (lower.includes("más antigua") || lower.includes("más antiguas") || lower.includes("clásica") || lower.includes("clásicas") || lower.includes("vieja") || lower.includes("viejas")) {
    filters.sortBy = "year_asc";
  } else if (lower.includes("mejor calificada") || lower.includes("mejor calificación") || lower.includes("mayor rating") || lower.includes("mejor rating")) {
    filters.sortBy = "rating_desc";
  } else if (lower.includes("peor calificada") || lower.includes("peor calificación") || lower.includes("menor rating")) {
    filters.sortBy = "rating_asc";
  }

  // Detect duration filter keywords
  const durationLessMatch = lower.match(/duración\s+menor\s+a\s+(\d+)\s*(?:h|hora|horas)/);
  if (durationLessMatch) {
    filters.maxDuration = parseInt(durationLessMatch[1]) * 60;
  }
  const durationMoreMatch = lower.match(/duración\s+(?:mayor|larg[ao]?)\s+a\s+(\d+)\s*(?:h|hora|horas)/);
  if (durationMoreMatch) {
    filters.minDuration = parseInt(durationMoreMatch[1]) * 60;
  }
  // "menos de 2 horas", "más de 1.5 horas"
  const lessThanMatch = lower.match(/(?:menos de|menor a|under)\s+(\d+(?:\.\d+)?)\s*(?:h|hora|horas)/);
  if (lessThanMatch) {
    filters.maxDuration = Math.round(parseFloat(lessThanMatch[1]) * 60);
  }
  const moreThanMatch = lower.match(/(?:más de|mayor a|over|more than)\s+(\d+(?:\.\d+)?)\s*(?:h|hora|horas)/);
  if (moreThanMatch) {
    filters.minDuration = Math.round(parseFloat(moreThanMatch[1]) * 60);
  }
  // "menos de 120 minutos", "más de 90 min"
  const lessMinMatch = lower.match(/(?:menos de|menor a)\s+(\d+)\s*(?:min|minutos)/);
  if (lessMinMatch) {
    filters.maxDuration = parseInt(lessMinMatch[1]);
  }
  const moreMinMatch = lower.match(/(?:más de|mayor a)\s+(\d+)\s*(?:min|minutos)/);
  if (moreMinMatch) {
    filters.minDuration = parseInt(moreMinMatch[1]);
  }

  // Detect year keywords (only 4-digit years)
  const yearMatch = lower.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1900 && year <= 2030) {
      filters.yearMin = year;
      filters.yearMax = year + 9;
    }
  }

  // Detect decade keywords
  if (lower.includes("años 80") || lower.includes("decada de los 80")) {
    filters.yearMin = 1980;
    filters.yearMax = 1989;
  } else if (lower.includes("años 90") || lower.includes("decada de los 90")) {
    filters.yearMin = 1990;
    filters.yearMax = 1999;
  } else if (lower.includes("años 2000")) {
    filters.yearMin = 2000;
    filters.yearMax = 2009;
  }

  // Detect location keywords
  const locationKeywords = ["ubicación", "location", "filmada", "grabada", "locación", "lugar", "ciudad", "país", "país de origen", "dónde se filmó", "dónde se grabó"];
  if (locationKeywords.some(kw => lower.includes(kw))) {
    filters.useLocationEmbedding = true;
  }

  // Detect region/country filters
  const LATAM_COUNTRIES = [
    "Argentina", "México", "Mexico", "Brasil", "Brazil", "Colombia", "Chile",
    "Perú", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay",
    "Cuba", "República Dominicana", "Guatemala", "Honduras", "El Salvador",
    "Nicaragua", "Costa Rica", "Panamá", "Panama", "Puerto Rico"
  ];

  const EUROPE_COUNTRIES = [
    "España", "Spain", "Francia", "France", "Italia", "Italy", "Alemania", "Germany",
    "Reino Unido", "United Kingdom", "UK", "Inglaterra", "England",
    "Portugal", "Países Bajos", "Netherlands", "Bélgica", "Belgium",
    "Suecia", "Sweden", "Noruega", "Norway", "Dinamarca", "Denmark",
    "Suiza", "Switzerland", "Austria", "Polonia", "Poland", "República Checa",
    "Grecia", "Greece", "Irlanda", "Ireland"
  ];

  const USA_CANADA = ["USA", "EE.UU", "Estados Unidos", "United States", "Canadá", "Canada"];

  if (lower.includes("latinoamérica") || lower.includes("latinoamerica") || lower.includes("américa latina") || lower.includes("america latina") || lower.includes("hispanoamérica") || lower.includes("hispanoamerica")) {
    filters.filterCountries = LATAM_COUNTRIES;
  } else if (lower.includes("europa") || lower.includes("europe")) {
    filters.filterCountries = EUROPE_COUNTRIES;
  } else if (lower.includes("usa") || lower.includes("estados unidos") || lower.includes("ee.uu") || lower.includes("américa del norte") || lower.includes("norteamérica") || lower.includes("canadá")) {
    filters.filterCountries = USA_CANADA;
  } else {
    // Check for specific country mentions
    const allCountries = [...LATAM_COUNTRIES, ...EUROPE_COUNTRIES, ...USA_CANADA];
    const mentionedCountries = allCountries.filter(c => lower.includes(c.toLowerCase()));
    if (mentionedCountries.length > 0) {
      filters.filterCountries = mentionedCountries;
    }
  }

  // Detect content rating keywords
  if (lower.includes("para niños") || lower.includes("aptas para niños") || lower.includes("familiar") || lower.includes("infantil") || lower.includes("sin clasificación") || lower.includes("sin clasificar")) {
    filters.contentRating = "G";
  } else if (lower.includes("rated r") || lower.includes("para adultos") || lower.includes("adultos")) {
    filters.contentRating = "R";
  } else if (lower.includes("pg-13") || lower.includes("pg 13") || lower.includes("mayores de 13")) {
    filters.contentRating = "PG-13";
  } else if (lower.includes("pg") || lower.includes("mayores de 7")) {
    filters.contentRating = "PG";
  } else if (lower.includes("nc-17") || lower.includes("solo adultos")) {
    filters.contentRating = "NC-17";
  }

  // Detect popularity/votes keywords
  if (lower.includes("más populares") || lower.includes("más votadas") || lower.includes("más conocidas")) {
    filters.minVotes = 10000;
  } else if (lower.includes("populares")) {
    filters.minVotes = 5000;
  }
  const votesMatch = lower.match(/(?:más de|mayor a|con)\s+(\d+)\s+votos?/);
  if (votesMatch) {
    filters.minVotes = parseInt(votesMatch[1]);
  }

  // Detect gross/revenue keywords
  if (lower.includes("más taquilleras") || lower.includes("mayor recaudación") || lower.includes("más recaudación")) {
    filters.minGross = 100000000;
  }
  const grossMatch = lower.match(/recaudación\s+(?:mayor a|más de)\s+(\d+)/);
  if (grossMatch) {
    filters.minGross = parseInt(grossMatch[1]);
  }

  // Detect country of origin keywords (different from filming location)
  if (lower.includes("producción de") || lower.includes("producida en") || lower.includes("hecha en") || lower.includes("origen de")) {
    const LATAM_ORIGIN = ["Argentina", "México", "Mexico", "Brasil", "Brazil", "Colombia", "Chile", "Perú", "Peru", "Venezuela", "Ecuador"];
    const EUROPE_ORIGIN = ["España", "Spain", "Francia", "France", "Italia", "Italy", "Alemania", "Germany", "Reino Unido", "United Kingdom"];
    const ALL_ORIGIN = [...LATAM_ORIGIN, ...EUROPE_ORIGIN, "USA", "Estados Unidos", "Japan", "Japón", "Korea", "Corea", "India", "China"];
    const mentioned = ALL_ORIGIN.filter(c => lower.includes(c.toLowerCase()));
    if (mentioned.length > 0) {
      filters.filterCountriesOfOrigin = mentioned;
    }
  }

  return filters;
}

function extractCount(question: string): number {
  const lower = question.toLowerCase();

  const countPatterns = [
    /dame\s+(\d+)/i,
    /muéstrame\s+(\d+)/i,
    /enséñame\s+(\d+)/i,
    /quiero\s+(\d+)/i,
    /necesito\s+(\d+)/i,
    /busca\s+(\d+)/i,
    /encuentra\s+(\d+)/i,
    /top\s+(\d+)/i,
    /las?\s+(\d+)\s+(?:mejores|peores)/i,
    /los?\s+(\d+)\s+(?:mejores|peores)/i,
    /(\d+)\s+(?:películas?|movies?)/i,
  ];

  for (const pattern of countPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const n = parseInt(match[1]);
      if (n >= 1 && n <= 20) return n;
    }
  }

  return 10;
}
function classifyQuery(question: string): "specific" | "semantic" {
  const lower = question.toLowerCase();

  const specificPatterns = [
    /(?:dame|dame el|dame la|dame los|dame las)\s+(?:trailer|url|link|enlace|información|datos|dato|info)/,
    /(?:cuál es|cuales son|cuáles son)\s+(?:el|la|los|las|el trailer|la url|el link)/,
    /(?:dónde ver|dónde puedo ver|en qué plataforma)/,
    /(?:qué año|cuándo salió|cuánto dura|año de|duración de|presupuesto de|recaudación de)/,
    /(?:quién dirigió|director de|reparto de|actores de|elenco de)/,
    /(?:dónde se filmó|dónde se grabó|ubicación de|location de)/,
    /(?:trailer|url|link|enlace)\s+(?:de|del|para|de la película)/,
    /(?:de el|del)\s+(?:club de la pelea|padrino|pulp fiction|inception|matrix|batman|superman|spider|avengers|toy story|finding nemo|frozen|avatar|titanic)/
  ];

  if (specificPatterns.some(p => p.test(lower))) {
    return "specific";
  }

  const specificKeywords = ["trailer", "url", "link", "enlace", "dónde ver", "dame el", "dame la", "cuál es el", "cuál es la", "cuánto dura", "duración", "cuándo salió", "año de", "quién dirigió", "director", "budget", "presupuesto", "recaudación"];
  const hasSpecificKeyword = specificKeywords.some(kw => lower.includes(kw));

  const hasMovieTitleIndicator = /(?:de|del|de la|el |la )\s+[A-Z]/.test(question) || /\b(?:club de la pelea|padrino|pulp fiction|inception|matrix|batman|superman|spider|avengers|toy story|finding nemo|frozen|avatar|titanic|fight club|godfather)\b/i.test(lower);

  if (hasSpecificKeyword || hasMovieTitleIndicator) {
    return "specific";
  }

  const semanticPatterns = [
    /(?:recomiéndame|recomendar|sugerir|sugiéreme)/,
    /(?:películas?|movies?)\s+(?:de|del|sobre|para|como|parecida|similar)/,
    /(?:algo|alguna|algunas|algún)\s+(?:parecida|similar|como|de)/,
    /(?:qué|cuáles)\s+(?:películas?|movies?)\s+(?:hay|tienes|conoces)/,
    /(?:buscar|encuentra|busca)\s+(?:películas?|algo)/,
    /(?:mejores|peores|más buenas|más malas)/,
    /(?:clásicas?|clásico|nuevas?|estrenos?)/
  ];

  if (semanticPatterns.some(p => p.test(lower))) {
    return "semantic";
  }

  return "semantic";
}

async function askGemini(question: string, context: string, movies: MovieResult[], isSpecific: boolean): Promise<string> {
  const moviesList = movies.map((m, i) => {
    return `${i + 1}. ${m.primary_title} (${m.start_year}) - Géneros: ${m.genres?.join(", ") || "N/A"} - Calificación: ${m.average_rating}/10 - Clasificación: ${m.content_rating || "N/A"} - URL: ${m.url || "N/A"} - Trailer: ${m.trailer || "N/A"}`;
  }).join("\n");

  const specificInstructions = isSpecific
    ? `RESPUESTA ESPECÍFICA: Responde en UNA SOLA LÍNEA con el dato exacto pedido.
Ejemplo: "El trailer de Fight Club (1999) es: https://youtube.com/watch?v=xxx"`
    : `RESPUESTA SEMÁNTICA: Responde en UNA SOLA LÍNEA confirmando lo que encontraste.
Ejemplo: "Aquí tienes las 5 comedias con mejor calificación."
NO listes las películas, solo confirma lo que se busca.`;

  const messages = [
    {
      role: "system",
      content: `Eres un asistente de películas. Tu ÚNICO trabajo es dar una respuesta breve en texto plano.

REGLAS ABSOLUTAS:
- Responde en MÁXIMO 1-2 líneas
- NUNCA listes películas (las tarjetas lo hacen por ti)
- NUNCA digas "no tengo información" si hay películas en la lista
- Copia el valor exacto del campo "Trailer" o "URL" si te lo piden
- Sin markdown, sin asteriscos, sin formato

${specificInstructions}

DATOS DISPONIBLES:
${moviesList}`
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
      temperature: 0,
      max_tokens: 2048,
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

    const { question, filters: userFilters = {} } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const detectedFilters = detectFiltersFromQuestion(question);
    const filters = { ...detectedFilters, ...userFilters };

    const queryType = classifyQuery(question);
    const isSpecific = queryType === "specific";
    const matchCount = isSpecific ? 1 : extractCount(question);

    const questionEmbedding = await getEmbedding(question);

    const matches = await searchMoviesHybrid(questionEmbedding, filters, matchCount);

    const context = matches
      .map(
        (m) =>
          `- ${m.primary_title} (${m.start_year}): ${m.description || "Sin descripción"}. Géneros: ${m.genres?.join(", ") || "N/A"}. Calificación: ${m.average_rating}/10. URL: ${m.url || "N/A"}. Trailer: ${m.trailer || "N/A"}. Duración: ${m.runtime_minutes || "N/A"} min. Ubicaciones: ${m.filming_locations?.join(", ") || "N/A"}`
      )
      .join("\n");

    const answer = await askGemini(question, context || "No hay películas disponibles.", matches, isSpecific);

    return new Response(
      JSON.stringify({
        answer,
        queryType,
        movies: matches.map((m) => ({
          id: m.id,
          title: m.primary_title,
          year: m.start_year,
          genres: m.genres,
          rating: m.average_rating,
          contentRating: m.content_rating,
          url: m.url,
          trailer: m.trailer,
          runtimeMinutes: m.runtime_minutes,
          filmingLocations: m.filming_locations,
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