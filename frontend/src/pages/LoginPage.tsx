import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.token, data.user)
      navigate('/')
    } catch { setError('Имэйл эсвэл нууц үг буруу') }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: '#1a1d2e', border: '1px solid #2d3148',
    borderRadius: '8px', fontSize: '0.875rem', color: '#e2e8f0',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>⚙</div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>WT130 Service</h1>
          <p style={{ color: '#64748b', marginTop: '0.375rem', fontSize: '0.8rem' }}>Засвар үйлчилгээний платформ</p>
        </div>

        <div style={{ background: '#13151f', borderRadius: '14px', border: '1px solid #1e2132', padding: '1.75rem' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Имэйл</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.mn" required style={inp} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Нууц үг</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
            </div>
            {error && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.625rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.01em' }}>
              {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
            </button>
          </form>
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e2132', fontSize: '0.7rem', color: '#475569', lineHeight: 1.8 }}>
            <div>Admin: admin@company.mn / admin123</div>
            <div>Механик: mechanic@company.mn / mech123</div>
            <div>Харилцагч: burdel@burdel.mn / client123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
