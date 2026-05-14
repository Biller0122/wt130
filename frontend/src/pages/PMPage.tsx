import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }

export default function PMPage() {
  const [tab, setTab] = useState<'schedule'|'order'>('schedule')
  const { data: schedule = [], isLoading } = useQuery({ queryKey: ['pm-schedule'], queryFn: () => api.get('/pm/schedule').then(r => r.data) })
  const { data: orderData } = useQuery({ queryKey: ['pm-order'], queryFn: () => api.get('/pm/order-list').then(r => r.data) })
  if (isLoading) return <div style={{ color: '#64748b', padding: '2rem' }}>Ачааллаж байна...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>PM Хуваарь</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>60 хоногийн үйлчилгээний төлөвлөгөө</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {(['schedule','order'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: '1px solid', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', background: tab === t ? '#1e2d4a' : 'transparent', color: tab === t ? '#818cf8' : '#64748b', borderColor: tab === t ? '#2d3d6a' : '#1e2132' }}>
              {t === 'schedule' ? 'Хуваарь' : 'Захиалгын жагсаалт'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'schedule' && (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Парк','SMR','Дараагийн PM','Хоног','2 сарт PM','Эрэмбэ'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {schedule.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #1a1d2e' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#e2e8f0', fontSize: '0.8rem' }}>{m.parkNumber}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{Math.round(m.estimatedSmr ?? m.currentSmr).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#818cf8', fontWeight: 500, fontSize: '0.8rem' }}>PM {m.nextPMInterval}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', color: m.urgency === 'critical' ? '#f87171' : m.urgency === 'warning' ? '#fbbf24' : '#e2e8f0' }}>{m.nextPMDays}өд</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {m.upcomingPMs?.map((p: any) => <span key={p.interval} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 500, background: p.interval >= 1000 ? '#2d1515' : '#1e2d4a', color: p.interval >= 1000 ? '#f87171' : '#818cf8' }}>PM{p.interval}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600, background: m.urgency === 'critical' ? '#2d1515' : m.urgency === 'warning' ? '#2d1f0a' : '#0f2318', color: m.urgency === 'critical' ? '#f87171' : m.urgency === 'warning' ? '#fbbf24' : '#4ade80' }}>
                      {m.urgency === 'critical' ? 'Яаралтай' : m.urgency === 'warning' ? 'Ойрхон' : 'Хэвийн'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'order' && orderData && (
        <div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.875rem' }}>2 сарын шаардлага · <span style={{ color: '#f87171', fontWeight: 600 }}>{orderData.summary?.urgentItems}</span> яаралтай</p>
          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Сэлбэгийн нэр','PM шаардлага','Нөөц (+20%)','Нийт захиалах','Яаралтай'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {orderData.orderList?.map((item: any) => (
                  <tr key={item.partId} style={{ borderBottom: '1px solid #1a1d2e', background: item.urgent ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#e2e8f0', fontSize: '0.8rem' }}>{item.partName}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{item.pmRequired} {item.unit}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#fbbf24', fontSize: '0.8rem' }}>+{item.buffer} {item.unit}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f1f5f9', fontSize: '0.8rem' }}>{item.totalQty} {item.unit}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600, background: item.urgent ? '#2d1515' : '#1a1d2e', color: item.urgent ? '#f87171' : '#475569' }}>{item.urgent ? 'Яаралтай' : 'Хэвийн'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
