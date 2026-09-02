import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import './App.css'

function App() {
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('coffee_rag_conversations')
    return saved ? JSON.parse(saved) : []
  })
  const [activeConversation, setActiveConversation] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    localStorage.setItem('coffee_rag_conversations', JSON.stringify(conversations))
  }, [conversations])

  const handleNewChat = () => {
    const newConv = {
      id: Date.now(),
      title: 'Nueva conversación',
      createdAt: Date.now(),
    }
    setConversations([newConv, ...conversations])
    setActiveConversation(newConv.id)
  }

  const handleSelectConversation = (id) => {
    setActiveConversation(id)
  }

  const handleDeleteConversation = (id) => {
    localStorage.removeItem(`coffee_rag_chat_${id}`)
    setConversations(conversations.filter((c) => c.id !== id))
    if (activeConversation === id) {
      setActiveConversation(null)
    }
  }

  const handleUpdateTitle = (id, title) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    )
  }

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
      />
      <ChatArea
        activeConversation={activeConversation}
        onUpdateTitle={handleUpdateTitle}
        onToggleSidebar={handleToggleSidebar}
        sidebarOpen={sidebarOpen}
      />
    </div>
  )
}

export default App
