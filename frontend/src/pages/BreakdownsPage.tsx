import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { format } from 'date-fns'
const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }
const CATS = ['Хүч дамжуулах','Хөдөлгүүр','Цахилгаан & Асаах','Дугуй солих','Түлш','Арал & Их бие','Явах анги','Хөргөлт','Бусад']
const inp: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0', boxSizing: 'border-box' }
export default function BreakdownsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ machineId: '', category: 'Хүч дамжуулах', description: '', smrAtBreak: '' })
  const { data = [], isLoading } = useQuery({ queryKey: ['breakdowns'], queryFn: () => api.get('/breakdowns').then(r => r.data) })
  const { data: machines = [] } = useQuery({ queryKey: ['machines-list'], queryFn: () => api.get('/machines').then(r => r.data) })
  const create = useMutation({ mutationFn: (d: any) => api.post('/breakdowns', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['breakdowns'] }); setShowForm(false); setForm({ machineId: '', category: 'Хүч дамжуулах', description: '', smrAtBreak: '' }) } })
  const resolve = useMutation({ mutationFn: (id: string) => api.patch(`/breakdowns/${id}`, { status: 'RESOLVED', resolvedAt: new Date() }), onSuccess: () => qc.invalidateQueries({ queryKey: ['breakdowns'] }) })
  if (isLoading) return <div style={{ color: '#64748b', padding: '2rem' }}>Ачааллаж байна...</div>
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Эвдрэлийн бүртгэл</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>{data.filter((b: any) => b.status === 'OPEN').length} нээлттэй</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>+ Эвдрэл бүртгэх</button>
      </div>
      {showForm && (
        <div style={{ background: '#13151f', borderRadius: '12px', border: '1px solid #2d3d6a', padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Шинэ эвдрэл бүртгэх</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Машин</label>
              <select style={{ ...inp }} value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}><option value="">Сонгох...</option>{machines.map((m: any) => <option key={m.id} value={m.id}>{m.parkNumber}</option>)}</select></div>
            <div><label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ангилал</label>
              <select style={{ ...inp }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Тайлбар</label>
              <input style={{ ...inp }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Эвдрэлийн дэлгэрэнгүй тайлбар..." /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => create.mutate(form)} disabled={!form.machineId || !form.description} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>Бүртгэх</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#64748b', border: '1px solid #2d3148', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>Цуцлах</button>
          </div>
        </div>
      )}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Машин','Ангилал','Тайлбар','Огноо','Байдал',''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.map((b: any) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #1a1d2e' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#e2e8f0', fontSize: '0.8rem' }}>{b.machine?.parkNumber}</td>
                <td style={{ padding: '0.75rem 1rem' }}><span style={{ background: '#1e2d4a', color: '#818cf8', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 600 }}>{b.category}</span></td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem', maxWidth: '220px' }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</div></td>
                <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.7rem' }}>{format(new Date(b.reportedAt), 'yyyy/MM/dd')}</td>
                <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600, background: b.status === 'RESOLVED' ? '#0f2318' : b.status === 'IN_PROGRESS' ? '#2d1f0a' : '#2d1515', color: b.status === 'RESOLVED' ? '#4ade80' : b.status === 'IN_PROGRESS' ? '#fbbf24' : '#f87171' }}>{b.status === 'RESOLVED' ? 'Шийдэгдсэн' : b.status === 'IN_PROGRESS' ? 'Явагдаж байна' : 'Нээлттэй'}</span></td>
                <td style={{ padding: '0.75rem 1rem' }}>{b.status === 'OPEN' && <button onClick={() => resolve.mutate(b.id)} style={{ background: 'transparent', border: '1px solid #1a3a20', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.7rem', color: '#4ade80' }}>✓ Дуусгах</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
