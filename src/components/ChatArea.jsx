import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import Message from './Message'
import InputBar from './InputBar'
import FilterPanel from './FilterPanel'
import './ChatArea.css'

function ChatArea({ activeConversation, onUpdateTitle, onToggleSidebar, sidebarOpen }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({})
  const [filterOpen, setFilterOpen] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (activeConversation) {
      const saved = localStorage.getItem(`coffee_rag_chat_${activeConversation}`)
      setMessages(saved ? JSON.parse(saved) : [])
    } else {
      setMessages([])
    }
  }, [activeConversation])

  useEffect(() => {
    if (activeConversation) {
      localStorage.setItem(`coffee_rag_chat_${activeConversation}`, JSON.stringify(messages))
    }
  }, [messages, activeConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text) => {
    const userMessage = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    if (messages.length === 0 && onUpdateTitle && activeConversation) {
      const title = text.length > 35 ? text.substring(0, 35) + '...' : text
      onUpdateTitle(activeConversation, title)
    }

    try {
      const activeFilters = {}
      if (filters.yearMin) activeFilters.yearMin = filters.yearMin
      if (filters.yearMax) activeFilters.yearMax = filters.yearMax
      if (filters.genres && filters.genres.length > 0) activeFilters.genres = filters.genres
      if (filters.minRating) activeFilters.minRating = filters.minRating
      if (filters.minDuration) activeFilters.minDuration = filters.minDuration
      if (filters.maxDuration) activeFilters.maxDuration = filters.maxDuration

      const data = await api.searchHybrid(text, activeFilters)

      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        movies: data.movies,
        queryType: data.queryType,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.message}`,
        isError: true,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="chat-area">
      <header className="chat-header">
        <button className="toggle-sidebar-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen ? (
              <path d="M19 12H5M12 19l-7-7 7-7" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
        <h1 className="chat-title">IMDV Search</h1>
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
        />
      </header>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2>¿Cómo puedo ayudarte hoy?</h2>
            <p className="welcome-sub">Carga documentos en el panel lateral y haz preguntas sobre su contenido.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message key={msg.id} role={msg.role} content={msg.content} movies={msg.movies} queryType={msg.queryType} isError={msg.isError} />
            ))}
            {loading && (
              <div className="loading-indicator">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <InputBar onSend={handleSend} disabled={loading} />
    </main>
  )
}

export default ChatArea
