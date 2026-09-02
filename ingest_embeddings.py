import json
import os
import requests
import time

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

EMBEDDING_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def get_embedding(text):
    res = requests.post(EMBEDDING_URL, json={
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 768,
    })
    if res.status_code != 200:
        raise Exception(f"Embedding error: {res.status_code} - {res.text}")
    return res.json()["embedding"]["values"]

def build_movie_text(movie):
    parts = []
    parts.append(f"Película: {movie['primary_title']}")
    if movie.get('start_year'):
        parts.append(f"Año: {movie['start_year']}")
    if movie.get('description'):
        parts.append(f"Descripción: {movie['description']}")
    if movie.get('genres') and len(movie['genres']) > 0:
        genres = movie['genres'] if isinstance(movie['genres'], list) else json.loads(movie['genres'])
        parts.append(f"Géneros: {', '.join(genres)}")
    if movie.get('interests') and len(movie['interests']) > 0:
        interests = movie['interests'] if isinstance(movie['interests'], list) else json.loads(movie['interests'])
        parts.append(f"Intereses: {', '.join(interests)}")
    if movie.get('average_rating'):
        parts.append(f"Calificación: {movie['average_rating']}/10")
    return ". ".join(parts)

def fetch_movies_without_embeddings():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/movies?select=id,primary_title,description,start_year,genres,interests,average_rating&embedding=is.null",
        headers=headers
    )
    if res.status_code != 200:
        raise Exception(f"Fetch error: {res.status_code} - {res.text}")
    return res.json()

def update_embedding(movie_id, embedding):
    res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/movies?id=eq.{movie_id}",
        headers=headers,
        json={"embedding": json.dumps(embedding)}
    )
    if res.status_code not in (200, 204):
        raise Exception(f"Update error: {res.status_code} - {res.text}")

def main():
    movies = fetch_movies_without_embeddings()
    print(f"Found {len(movies)} movies without embeddings")

    processed = 0
    errors = 0

    for movie in movies:
        try:
            text = build_movie_text(movie)
            embedding = get_embedding(text)
            update_embedding(movie["id"], embedding)
            processed += 1

            if processed % 10 == 0:
                print(f"Processed {processed}/{len(movies)} movies")

            time.sleep(0.1)
        except Exception as e:
            print(f"Error processing movie {movie['id']}: {e}")
            errors += 1

    print(f"Done! Processed: {processed}, Errors: {errors}")

if __name__ == "__main__":
    main()
