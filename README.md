# IMDb Search — Movie RAG Chatbot

Chatbot de películas con Retrieval-Augmented Generation (RAG). Busca películas de IMDb usando lenguaje natural: filtros por género, año, duración, rating, ubicación de filmación, país de origen y más.

## Arquitectura

```
Frontend (React + Vite)
    │
    ▼
Supabase Edge Function (search-hybrid)
    │
    ├── Gemini Embedding API (gemini-embedding-001, 768 dims)
    ├── pgvector (PostgreSQL) — búsqueda semántica + filtros
    └── DeepSeek Chat — genera respuesta en lenguaje natural
```

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 8, CSS custom |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL + pgvector (Supabase) |
| Embeddings | Google Gemini (`gemini-embedding-001`, 768-dim) |
| LLM | DeepSeek Chat (temperature: 0) |
| Deployment | Supabase (backend) |

## Funcionalidades

- **Búsqueda semántica**: entiende queries como "películas emocionantes sobre redención"
- **Filtros inteligentes**: detecta automáticamente género, año, duración, rating, ubicación, país de origen, popularidad
- **Clasificación de queries**: distingue entre búsquedas específicas (1 resultado) y semánticas (múltiples)
- **Tarjetas de película**: tráiler, IMDb link, runtime, géneros, clasificación por edad, ubicaciones de filmación
- **Conversaciones persistentes**: historial guardado en localStorage

## Filtros Soportados

| Tipo | Ejemplo |
|------|---------|
| Género | "thriller", "comedia", "drama" |
| Año | "de los años 80", "de 2015" |
| Duración | "menos de 2 horas", "más de 90 minutos" |
| Rating | "mejor calificadas", "rating mayor a 8" |
| Ubicación | "filmadas en Argentina", "latinoamérica" |
| País origen | "producción de Japón" |
| Clasificación | "para niños", "rated R" |
| Popularidad | "más populares", "más votadas" |
| Recaudación | "más taquilleras" |

## Setup

### Prerequisitos

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Cuentas en: [Google AI Studio](https://aistudio.google.com/), [DeepSeek Platform](https://platform.deepseek.com/)

### 1. Clonar e instalar

```bash
git clone https://github.com/ELKIN/Coffee_RAG.git
cd Coffee_RAG
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales reales.

### 3. Supabase

```bash
# Login
supabase login

# Vincular proyecto
supabase link --project-ref ukcpaojppbjkqzxhfbbs

# Aplicar migraciones
supabase db query --linked --file supabase/migrations/001_enable_pgvector.sql
supabase db query --linked --file supabase/migrations/003_create_movies_table.sql
supabase db query --linked --file supabase/migrations/004_movies_embeddings.sql

# Configurar secrets de Edge Functions
supabase secrets set GEMINI_API_KEY=tu_key DEEPSEEK_API_KEY=tu_key

# Desplegar Edge Function
supabase functions deploy search-hybrid
```

### 4. Cargar datos

```bash
# Insertar películas desde CSV (script no incluido en el repo)
# Generar embeddings
python ingest_embeddings.py
```

### 5. Desarrollo

```bash
npm run dev
```

## Variables de Entorno

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Frontend | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Anon key (pública, segura en cliente) |
| `SUPABASE_URL` | Edge Functions | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Service role key (privada) |
| `GEMINI_API_KEY` | Edge Functions | Google AI Studio API key |
| `DEEPSEEK_API_KEY` | Edge Functions | DeepSeek Platform API key |

## Estructura del Proyecto

```
IMDb RAG/
├── src/
│   ├── components/
│   │   ├── ChatArea.jsx       # Chat principal
│   │   ├── Message.jsx        # Tarjetas de película
│   │   ├── FilterPanel.jsx    # Panel de filtros
│   │   ├── InputBar.jsx       # Input de usuario
│   │   ├── Sidebar.jsx        # Conversaciones
│   │   └── FileUpload.jsx     # Carga de documentos
│   ├── lib/
│   │   └── api.js             # Cliente API
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── migrations/
│   │   ├── 001_enable_pgvector.sql
│   │   ├── 003_create_movies_table.sql
│   │   └── 004_movies_embeddings.sql
│   └── functions/
│       ├── search-hybrid/     # Búsqueda principal
│       ├── ingest/            # Ingesta de documentos
│       ├── ingest-movies/     # Generación de embeddings
│       └── ask/               # Preguntas generales
├── ingest_embeddings.py       # Script de embeddings
├── .env.example
├── package.json
└── vite.config.js
```

## License

MIT
