import { useState, useRef } from 'react'
import { api } from '../lib/api'
import './FileUpload.css'

function FileUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      id: `${f.name}-${Date.now()}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setResults([])
    const newResults = []

    for (const fileEntry of files) {
      if (fileEntry.status === 'done') continue

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileEntry.id ? { ...f, status: 'uploading' } : f
        )
      )

      try {
        const text = await readFileAsText(fileEntry.file)
        if (!text.trim()) {
          throw new Error('El archivo está vacío')
        }

        const data = await api.ingest(text, fileEntry.name)

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id ? { ...f, status: 'done' } : f
          )
        )

        newResults.push({
          name: fileEntry.name,
          chunks: data.chunks_inserted,
          success: true,
        })
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id ? { ...f, status: 'error' } : f
          )
        )
        newResults.push({
          name: fileEntry.name,
          error: err.message,
          success: false,
        })
      }
    }

    setResults(newResults)
    setUploading(false)

    if (onUploadComplete) {
      onUploadComplete(newResults)
    }
  }

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearAll = () => {
    setFiles([])
    setResults([])
  }

  return (
    <div className="file-upload">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.csv,.json,.log"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Cargar documentos
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f) => (
            <div key={f.id} className={`file-item ${f.status}`}>
              <div className="file-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="file-name">{f.name}</span>
                <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="file-status">
                {f.status === 'pending' && (
                  <button className="remove-btn" onClick={() => removeFile(f.id)}>×</button>
                )}
                {f.status === 'uploading' && <span className="spinner" />}
                {f.status === 'done' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10a37f" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {f.status === 'error' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
              </div>
            </div>
          ))}

          <div className="file-actions">
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={uploading || files.every((f) => f.status === 'done')}
            >
              {uploading ? 'Procesando...' : 'Cargar documentos'}
            </button>
            <button className="clear-btn" onClick={clearAll} disabled={uploading}>
              Limpiar
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="upload-results">
          {results.map((r, i) => (
            <div key={i} className={`result-item ${r.success ? 'success' : 'error'}`}>
              {r.success
                ? `${r.name}: ${r.chunks} chunks insertados`
                : `${r.name}: ${r.error}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload
