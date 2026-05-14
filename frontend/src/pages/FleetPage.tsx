import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }
const td = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#cbd5e1', ...extra })

function UrgBadge({ u }: { u: string }) {
  const cfg = u === 'critical' ? ['#2d1515','#f87171','Яаралтай'] : u === 'warning' ? ['#2d1f0a','#fbbf24','Ойрхон'] : ['#0f2318','#4ade80','Хэвийн']
  return <span style={{ background: cfg[0], color: cfg[1], fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600 }}>{cfg[2]}</span>
}

export default function FleetPage() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({ queryKey: ['fleet'], queryFn: () => api.get('/machines').then(r => r.data) })
  if (isLoading) return <div style={{ color: '#64748b', padding: '2rem' }}>Ачааллаж байна...</div>
  const critical = data.filter((m: any) => m.urgency === 'critical').length

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Флот хяналт</h1>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>{data.length} техник · {critical} яаралтай</p>
      </div>
      {critical > 0 && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171' }}>⚠ {critical} техник яаралтай PM шаардаж байна — 7 хоногийн дотор үйлчилгээнд оруулах шаардлагатай</div>}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Парк дугаар','Одоогийн SMR','Дараагийн PM','Хоног','2 сарт PM','Байдал'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.map((m: any) => (
              <tr key={m.id} onClick={() => navigate(`/fleet/${m.id}`)} style={{ borderBottom: '1px solid #1a1d2e', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={td({ fontWeight: 500, color: '#e2e8f0' })}>🚛 {m.parkNumber}</td>
                <td style={td()}>{Math.round(m.estimatedSmr ?? m.currentSmr).toLocaleString()} ц</td>
                <td style={td()}><span style={{ color: '#818cf8', fontWeight: 500 }}>PM {m.nextPMInterval}</span><span style={{ color: '#475569', fontSize: '0.7rem', marginLeft: '4px' }}>@ {(m.nextPMSmr ?? 0).toLocaleString()}</span></td>
                <td style={td({ fontWeight: 600, color: m.urgency === 'critical' ? '#f87171' : m.urgency === 'warning' ? '#fbbf24' : '#e2e8f0' })}>{m.nextPMDays} өдөр</td>
                <td style={td()}>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {m.upcomingPMs?.slice(0, 4).map((p: any) => (
                      <span key={p.interval} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 500, background: p.urgency === 'critical' ? '#2d1515' : p.interval >= 1000 ? '#2d1f0a' : '#1e2d4a', color: p.urgency === 'critical' ? '#f87171' : p.interval >= 1000 ? '#fbbf24' : '#818cf8' }}>PM{p.interval}</span>
                    ))}
                  </div>
                </td>
                <td style={td()}><UrgBadge u={m.urgency} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
