const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const api = {
  async ingest(text, source = 'manual') {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text, source }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Error al ingestar documento')
    }
    return res.json()
  },

  async ask(question) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Error al consultar')
    }
    return res.json()
  },

  async searchHybrid(question, filters = {}) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/search-hybrid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ question, filters }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Error en la búsqueda')
    }
    return res.json()
  },

  async ingestMovies() {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Error al ingestar películas')
    }
    return res.json()
  },
}
