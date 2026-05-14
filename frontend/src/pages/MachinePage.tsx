import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { format } from 'date-fns'

const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.25rem' }

export default function MachinePage() {
  const { id } = useParams(); const navigate = useNavigate()
  const { data: m, isLoading } = useQuery({ queryKey: ['machine', id], queryFn: () => api.get(`/machines/${id}`).then(r => r.data) })
  if (isLoading || !m) return <div style={{ color: '#64748b', padding: '2rem' }}>Ачааллаж байна...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/fleet')} style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', padding: '0.375rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}>← Буцах</button>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{m.parkNumber}</h1>
          <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>{m.manufacturer} {m.model} · {m.location}</p>
        </div>
        {m.urgency === 'critical' && <span style={{ marginLeft: 'auto', background: '#2d1515', color: '#f87171', fontSize: '0.7rem', padding: '4px 12px', borderRadius: '9999px', fontWeight: 600 }}>⚠ Яаралтай PM</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { l: 'Одоогийн SMR', v: `${Math.round(m.estimatedSmr ?? m.currentSmr).toLocaleString()} ц`, a: '#6366f1' },
          { l: 'Дараагийн PM', v: `PM ${m.nextPMInterval}`, a: '#818cf8' },
          { l: 'Өдөрт дундаж', v: `${m.dailyAvgSmr} ц/өдөр`, a: '#4ade80' },
          { l: 'Байдал', v: m.status === 'ACTIVE' ? '✅ Ажиллаж байна' : '🔧 Засварт', a: '#fbbf24' },
        ].map(s => (
          <div key={s.l} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: s.a, borderRadius: '12px 0 0 12px' }} />
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, paddingLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0.375rem 0 0', paddingLeft: '0.5rem' }}>{s.v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div style={card}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' }}>🔧 Сүүлийн PM үйлчилгээнүүд</p>
          {m.pmRecords?.length ? m.pmRecords.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1d2e', fontSize: '0.8rem' }}>
              <span style={{ background: '#1e2d4a', color: '#818cf8', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>PM {p.pmType}</span>
              <span style={{ color: '#94a3b8' }}>{p.smrAtPM?.toLocaleString()} ц</span>
              <span style={{ color: '#475569', fontSize: '0.7rem' }}>{format(new Date(p.doneAt), 'yyyy/MM/dd')}</span>
            </div>
          )) : <p style={{ color: '#475569', fontSize: '0.8rem' }}>Бүртгэл байхгүй</p>}
        </div>
        <div style={card}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' }}>⚠ Сүүлийн эвдрэлүүд</p>
          {m.breakdowns?.length ? m.breakdowns.map((b: any) => (
            <div key={b.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #1a1d2e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#e2e8f0' }}>{b.category}</span>
                <span style={{ fontSize: '0.65rem', padding: '1px 8px', borderRadius: '9999px', background: b.status === 'RESOLVED' ? '#0f2318' : '#2d1515', color: b.status === 'RESOLVED' ? '#4ade80' : '#f87171', fontWeight: 600 }}>{b.status === 'RESOLVED' ? 'Шийдэгдсэн' : 'Нээлттэй'}</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>{b.description}</p>
            </div>
          )) : <p style={{ color: '#4ade80', fontSize: '0.8rem' }}>✅ Эвдрэл бүртгэлгүй</p>}
        </div>
      </div>
    </div>
  )
}
