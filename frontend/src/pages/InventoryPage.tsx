import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }
export default function InventoryPage() {
  const [showLow, setShowLow] = useState(false)
  const { data = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => api.get('/inventory').then(r => r.data) })
  const filtered = showLow ? data.filter((p: any) => p.stockQty <= p.minStockQty) : data
  const lowCount = data.filter((p: any) => p.stockQty <= p.minStockQty).length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Агуулах</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>{lowCount} дутагдалтай сэлбэг байна</p>
        </div>
        <button onClick={() => setShowLow(!showLow)} style={{ padding: '0.5rem 1rem', background: showLow ? '#2d1515' : 'transparent', color: showLow ? '#f87171' : '#64748b', border: `1px solid ${showLow ? '#7f1d1d' : '#2d3148'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
          {showLow ? 'Бүгдийг харах' : `⚠ Дутагдалтай (${lowCount})`}
        </button>
      </div>
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Нэр','Ангилал','Нөөц','Доод хэмжээ','Байдал'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1a1d2e' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#e2e8f0', fontSize: '0.8rem' }}>▤ {p.name}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', color: '#475569' }}>{p.category}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f1f5f9', fontSize: '0.8rem' }}>{p.stockQty} {p.unit}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem' }}>{p.minStockQty} {p.unit}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600, background: p.stockQty <= 0 ? '#2d1515' : p.stockQty <= p.minStockQty ? '#2d1f0a' : '#0f2318', color: p.stockQty <= 0 ? '#f87171' : p.stockQty <= p.minStockQty ? '#fbbf24' : '#4ade80' }}>
                    {p.stockQty <= 0 ? 'Дууссан' : p.stockQty <= p.minStockQty ? 'Дутагдалтай' : 'Хангалттай'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
