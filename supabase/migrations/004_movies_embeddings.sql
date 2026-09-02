ALTER TABLE movies ADD COLUMN IF NOT EXISTS embedding extensions.vector(768);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS filming_locations_embedding extensions.vector(768);

CREATE OR REPLACE FUNCTION search_movies_hybrid(
  query_embedding extensions.vector(768),
  match_threshold FLOAT,
  match_count INT,
  filter_year_min INT DEFAULT NULL,
  filter_year_max INT DEFAULT NULL,
  filter_genres TEXT[] DEFAULT NULL,
  filter_min_rating NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT NULL,
  use_location_embedding BOOLEAN DEFAULT FALSE,
  filter_countries TEXT[] DEFAULT NULL,
  filter_content_rating TEXT DEFAULT NULL,
  filter_min_votes INT DEFAULT NULL,
  filter_countries_of_origin TEXT[] DEFAULT NULL,
  filter_min_gross NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  primary_title TEXT,
  description TEXT,
  start_year INTEGER,
  genres JSONB,
  average_rating NUMERIC,
  content_rating TEXT,
  url TEXT,
  trailer TEXT,
  runtime_minutes INTEGER,
  filming_locations JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    movies.id,
    movies.primary_title,
    movies.description,
    movies.start_year,
    movies.genres,
    movies.average_rating,
    movies.content_rating,
    movies.url,
    movies.trailer,
    movies.runtime_minutes,
    movies.filming_locations,
    CASE
      WHEN use_location_embedding AND movies.filming_locations_embedding IS NOT NULL THEN
        1 - (movies.filming_locations_embedding <=> query_embedding)
      ELSE
        1 - (movies.embedding <=> query_embedding)
    END AS similarity
  FROM movies
  WHERE
    CASE
      WHEN use_location_embedding AND movies.filming_locations_embedding IS NOT NULL THEN
        1 - (movies.filming_locations_embedding <=> query_embedding)
      ELSE
        1 - (movies.embedding <=> query_embedding)
    END > match_threshold
    AND (filter_year_min IS NULL OR movies.start_year >= filter_year_min)
    AND (filter_year_max IS NULL OR movies.start_year <= filter_year_max)
    AND (filter_genres IS NULL OR movies.genres ?| filter_genres)
    AND (filter_min_rating IS NULL OR movies.average_rating >= filter_min_rating)
    AND (filter_content_rating IS NULL OR movies.content_rating = filter_content_rating)
    AND (filter_min_votes IS NULL OR movies.num_votes >= filter_min_votes)
    AND (filter_countries_of_origin IS NULL OR movies.countries_of_origin ?| filter_countries_of_origin)
    AND (filter_min_gross IS NULL OR movies.gross_worldwide >= filter_min_gross)
    AND (filter_countries IS NULL OR movies.filming_locations IS NOT NULL AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(movies.filming_locations) AS loc
      WHERE EXISTS (
        SELECT 1 FROM unnest(filter_countries) AS country
        WHERE lower(loc) LIKE '%' || lower(country) || '%'
      )
    ))
  ORDER BY
    CASE WHEN sort_by = 'rating_desc' THEN movies.average_rating END DESC NULLS LAST,
    CASE WHEN sort_by = 'rating_asc' THEN movies.average_rating END ASC NULLS LAST,
    CASE WHEN sort_by = 'duration_asc' THEN movies.runtime_minutes END ASC NULLS LAST,
    CASE WHEN sort_by = 'duration_desc' THEN movies.runtime_minutes END DESC NULLS LAST,
    CASE WHEN sort_by = 'year_asc' THEN movies.start_year END ASC NULLS LAST,
    CASE WHEN sort_by = 'year_desc' THEN movies.start_year END DESC NULLS LAST,
    CASE WHEN sort_by = 'popularity' THEN movies.num_votes END DESC NULLS LAST,
    CASE WHEN sort_by = 'gross' THEN movies.gross_worldwide END DESC NULLS LAST,
    CASE
      WHEN use_location_embedding AND movies.filming_locations_embedding IS NOT NULL THEN
        movies.filming_locations_embedding <=> query_embedding
      ELSE
        movies.embedding <=> query_embedding
    END ASC
  LIMIT match_count;
$$;