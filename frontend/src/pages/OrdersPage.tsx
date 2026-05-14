import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { format } from 'date-fns'
const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }
export default function OrdersPage() {
  const { data = [] } = useQuery({ queryKey: ['orders'], queryFn: () => api.get('/orders').then(r => r.data) })
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Захиалга</h1>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>Сэлбэгийн захиалгын бүртгэл</p>
      </div>
      <div style={card}>
        {data.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>◈</div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Захиалга байхгүй байна</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#2d3148' }}>PM хуваарь → Захиалгын жагсаалт-аас үүсгэнэ</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Захиалгын №','Төрөл','Зүйл','Огноо','Байдал'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.map((o: any) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #1a1d2e' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b' }}>{o.orderNumber?.slice(0,12)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#e2e8f0' }}>{o.type === 'PLANNED' ? 'Төлөвлөгдсөн' : o.type === 'EMERGENCY' ? '🚨 Яаралтай' : 'Нөөц'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{o.items?.length ?? 0} зүйл</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.7rem' }}>{format(new Date(o.createdAt), 'yyyy/MM/dd')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600, background: o.status === 'APPROVED' ? '#0f2318' : o.status === 'SUBMITTED' ? '#1e2d4a' : '#1a1d2e', color: o.status === 'APPROVED' ? '#4ade80' : o.status === 'SUBMITTED' ? '#818cf8' : '#475569' }}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
