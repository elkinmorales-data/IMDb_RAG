import { useState } from 'react'
import './InputBar.css'

function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="input-bar-wrapper">
      <form className="input-bar" onSubmit={handleSubmit}>
        <textarea
          className="input-field"
          placeholder="Escribe un mensaje..."
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!text.trim() || disabled}
          aria-label="Enviar mensaje"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
      <p className="input-disclaimer">
        Coffee RAG puede cometer errores. Verifica la información importante.
      </p>
    </div>
  )
}

export default InputBar
