import FileUpload from './FileUpload'
import './Sidebar.css'

function Sidebar({ conversations, activeConversation, onSelect, onNewChat, onDelete, isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo chat
        </button>
      </div>

      <div className="sidebar-upload">
        <FileUpload />
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Historial</div>
        <ul className="conversation-list">
          {conversations.length === 0 && (
            <li className="empty-state">Sin conversaciones</li>
          )}
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                className={`conversation-item ${activeConversation === conv.id ? 'active' : ''}`}
                onClick={() => onSelect(conv.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="conv-title">{conv.title}</span>
              </button>
              <button
                className="delete-conv-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(conv.id)
                }}
                aria-label="Eliminar conversación"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
