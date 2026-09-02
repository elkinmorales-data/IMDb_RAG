import { useState } from 'react'
import './FilterPanel.css'

const AVAILABLE_GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
]

function FilterPanel({ filters, onFiltersChange, isOpen, onToggle }) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleYearChange = (key, value) => {
    const numValue = value ? parseInt(value) : null
    const updated = { ...localFilters, [key]: numValue }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  const handleGenreToggle = (genre) => {
    const current = localFilters.genres || []
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre]
    const newFilters = { ...localFilters, genres: updated.length > 0 ? updated : null }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleRatingChange = (value) => {
    const numValue = value ? parseFloat(value) : null
    const updated = { ...localFilters, minRating: numValue }
    setLocalFilters(updated)
    onFiltersChange(updated)
  }

  const clearFilters = () => {
    const empty = { yearMin: null, yearMax: null, genres: null, minRating: null }
    setLocalFilters(empty)
    onFiltersChange(empty)
  }

  const hasActiveFilters = localFilters.yearMin || localFilters.yearMax ||
    (localFilters.genres && localFilters.genres.length > 0) || localFilters.minRating

  return (
    <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
      <button className="filter-toggle" onClick={onToggle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filtros
        {hasActiveFilters && <span className="filter-badge" />}
      </button>

      {isOpen && (
        <div className="filter-content">
          <div className="filter-section">
            <label className="filter-label">Año</label>
            <div className="filter-row">
              <input
                type="number"
                placeholder="Desde"
                value={localFilters.yearMin || ''}
                onChange={(e) => handleYearChange('yearMin', e.target.value)}
                className="filter-input"
                min="1900"
                max="2030"
              />
              <span className="filter-separator">-</span>
              <input
                type="number"
                placeholder="Hasta"
                value={localFilters.yearMax || ''}
                onChange={(e) => handleYearChange('yearMax', e.target.value)}
                className="filter-input"
                min="1900"
                max="2030"
              />
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Géneros</label>
            <div className="genre-grid">
              {AVAILABLE_GENRES.map((genre) => (
                <button
                  key={genre}
                  className={`genre-chip ${(localFilters.genres || []).includes(genre) ? 'active' : ''}`}
                  onClick={() => handleGenreToggle(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Rating mínimo</label>
            <input
              type="number"
              placeholder="0 - 10"
              value={localFilters.minRating || ''}
              onChange={(e) => handleRatingChange(e.target.value)}
              className="filter-input full"
              min="0"
              max="10"
              step="0.5"
            />
          </div>

          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterPanel