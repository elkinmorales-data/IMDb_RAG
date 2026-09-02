import './Message.css'

function Message({ role, content, movies, queryType, isError }) {
  const isUser = role === 'user'
  const isSpecific = queryType === 'specific'

  const formatContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ))
  }

  const formatRuntime = (minutes) => {
    if (!minutes) return null
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user-avatar">U</div>
        ) : (
          <div className="avatar assistant-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="message-content">
        <p>{formatContent(content)}</p>
        {movies && movies.length > 0 && (
          <div className={`message-movies ${isSpecific ? 'specific' : 'semantic'}`}>
            {isSpecific ? (
              <div className="movies-list">
                {movies.slice(0, 1).map((movie) => (
                  <div key={movie.id} className="movie-card specific-card">
                    <div className="movie-info">
                      <span className="movie-title">{movie.title}</span>
                      <span className="movie-meta">
                        {movie.year && `(${movie.year})`}
                        {movie.rating && ` · ${movie.rating}/10`}
                        {movie.runtimeMinutes && ` · ${formatRuntime(movie.runtimeMinutes)}`}
                      </span>
                      <div className="movie-tags">
                        {movie.contentRating && (
                          <span className={`rating-badge ${movie.contentRating.replace('-', '').toLowerCase()}`}>
                            {movie.contentRating}
                          </span>
                        )}
                        {movie.genres && movie.genres.length > 0 && movie.genres.map((g, i) => (
                          <span key={i} className="genre-tag">{g}</span>
                        ))}
                      </div>
                      {movie.filmingLocations && movie.filmingLocations.length > 0 && (
                        <span className="movie-locations">
                          📍 {movie.filmingLocations.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="movie-links">
                      {movie.trailer && (
                        <a
                          href={movie.trailer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="movie-link trailer-link"
                          title="Ver trailer"
                        >
                          ▶ Trailer
                        </a>
                      )}
                      {movie.url && (
                        <a
                          href={movie.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="movie-link imdb-link"
                          title="Ver en IMDb"
                        >
                          IMDb
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <span className="movies-label">{movies.length} películas encontradas</span>
                <div className="movies-list">
                  {movies.map((movie) => (
                    <div key={movie.id} className="movie-card">
                      <div className="movie-info">
                        <span className="movie-title">{movie.title}</span>
                        <span className="movie-meta">
                          {movie.year && `(${movie.year})`}
                          {movie.rating && ` · ${movie.rating}/10`}
                          {movie.runtimeMinutes && ` · ${formatRuntime(movie.runtimeMinutes)}`}
                        </span>
                        <div className="movie-tags">
                          {movie.contentRating && (
                            <span className={`rating-badge ${movie.contentRating.replace('-', '').toLowerCase()}`}>
                              {movie.contentRating}
                            </span>
                          )}
                          {movie.genres && movie.genres.length > 0 && movie.genres.map((g, i) => (
                            <span key={i} className="genre-tag">{g}</span>
                          ))}
                        </div>
                        {movie.filmingLocations && movie.filmingLocations.length > 0 && (
                          <span className="movie-locations">
                            📍 {movie.filmingLocations.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="movie-links">
                        {movie.trailer && (
                          <a
                            href={movie.trailer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="movie-link trailer-link"
                            title="Ver trailer"
                          >
                            ▶ Trailer
                          </a>
                        )}
                        {movie.url && (
                          <a
                            href={movie.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="movie-link imdb-link"
                            title="Ver en IMDb"
                          >
                            IMDb
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Message