import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK = [
  'Яаралтай PM шаардагдах техникүүд?',
  'Нөөц дутагдалтай сэлбэгүүд?',
  'Хамгийн олон эвдэрдэг систем?',
  'Өнөөдөр хийх засвар юу байна?',
]

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Сайн байна уу! Би WT130 засварын туслах AI юм. Флот, PM хуваарь, эвдрэлийн талаар асуугаарай.' }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const { data } = await api.post('/chat', { message: msg, history: messages.slice(-6) })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ Ollama холбогдохгүй байна. \`ollama run ${process.env.VITE_OLLAMA_MODEL || 'gemma3:4b'}\` ажиллуулсан эсэхийг шалгана уу.` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000,
          width: '52px', height: '52px', borderRadius: '50%',
          background: open ? '#1e2132' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: '1px solid #2d3158', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          transition: 'all 0.2s',
        }}
        title="AI Туслах"
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5rem', right: '1.5rem', zIndex: 999,
          width: '340px', height: '480px',
          background: '#13151f', border: '1px solid #2d3158',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #1e2132', display: 'flex', alignItems: 'center', gap: '0.625rem', background: '#0f1117' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>✦</div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>WT130 AI Туслах</div>
              <div style={{ fontSize: '0.65rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                Gemma · Локал
              </div>
            </div>
            <button onClick={() => setMessages([{ role: 'assistant', content: 'Сайн байна уу! Би WT130 засварын туслах AI юм.' }])}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #2d3148', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.65rem', color: '#475569' }}>
              Цэвэрлэх
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1a1d2e',
                  border: m.role === 'user' ? 'none' : '1px solid #2d3148',
                  fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.55,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: '12px 12px 12px 4px', background: '#1a1d2e', border: '1px solid #2d3148', fontSize: '0.78rem', color: '#818cf8' }}>
                  <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                    {[0,1,2].map(j => (
                      <span key={j} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#818cf8', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }}></span>
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 0.875rem 0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)} style={{ padding: '3px 8px', background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '9999px', fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap' }}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid #1e2132', display: 'flex', gap: '0.5rem', background: '#0f1117' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Асуулт бич..."
              style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: '34px', height: '34px', borderRadius: '8px', background: input.trim() && !loading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1a1d2e', border: '1px solid #2d3148', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: '0.875rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
