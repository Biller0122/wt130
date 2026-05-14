import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.25rem' }
export default function ClientPortalPage() {
  const { data: machines = [] } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/machines').then(r => r.data) })
  const { data: breakdowns = [] } = useQuery({ queryKey: ['breakdowns'], queryFn: () => api.get('/breakdowns').then(r => r.data) })
  const open = breakdowns.filter((b: any) => b.status === 'OPEN')
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Харилцагчийн портал</h1>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>Харилцагч компаниудын техникийн байдал</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div style={card}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' }}>🚛 Техникүүдийн байдал</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {machines.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#0f1117', borderRadius: '8px', border: '1px solid #1e2132' }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#e2e8f0' }}>{m.parkNumber}</span>
                  <span style={{ fontSize: '0.7rem', color: '#475569', marginLeft: '0.5rem' }}>{m.client?.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{Math.round(m.estimatedSmr ?? m.currentSmr).toLocaleString()} ц</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#818cf8' }}>PM{m.nextPMInterval}·{m.nextPMDays}өд</span>
                  {m.urgency === 'critical' && <span style={{ background: '#2d1515', color: '#f87171', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>Яаралтай</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.875rem' }}>⚠ Нээлттэй эвдрэлүүд</p>
          {open.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#4ade80' }}>✅ Нээлттэй эвдрэл байхгүй</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {open.map((b: any) => (
                <div key={b.id} style={{ padding: '0.625rem', background: '#2d1515', borderRadius: '8px', border: '1px solid #7f1d1d' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#f87171' }}>{b.machine?.parkNumber} — {b.category}</div>
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
