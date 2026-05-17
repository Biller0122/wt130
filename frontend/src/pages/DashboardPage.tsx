import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { format } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard').then(r => r.data) })
  const { data: fleet = [] } = useQuery({ queryKey: ['fleet'], queryFn: () => api.get('/machines').then(r => r.data) })
  const { data: bdStats } = useQuery({ queryKey: ['bd-stats'], queryFn: () => api.get('/breakdowns/stats').then(r => r.data) })
  const { data: schedule = [] } = useQuery({ queryKey: ['pm-schedule'], queryFn: () => api.get('/pm/schedule').then(r => r.data) })
  const { data: lowStock = [] } = useQuery({ queryKey: ['low-stock'], queryFn: () => api.get('/inventory/low-stock').then(r => r.data) })

  const critical = fleet.filter((m: any) => m.urgency === 'critical').length
  const warning = fleet.filter((m: any) => m.urgency === 'warning').length
  const urgentPMs = schedule.filter((m: any) => m.nextPMDays <= 7)

  const bdByCategory = bdStats?.byCategory?.slice(0, 6).map((b: any) => ({
    name: b.category?.slice(0, 12) ?? '—',
    тоо: b._count,
    цаг: Math.round(b._sum?.downtimeHrs ?? 0),
  })) ?? []

  const S = {
    card: { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.25rem' } as React.CSSProperties,
    label: { fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.07em', margin: 0 },
    val: { fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', margin: '0.25rem 0 0' },
    sub: { fontSize: '0.7rem', color: '#475569', margin: '3px 0 0' },
    secTitle: { fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.07em', margin: '0 0 0.875rem' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1a1d2e' } as React.CSSProperties,
  }

  const tooltipStyle = { background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', fontSize: '0.75rem', color: '#e2e8f0' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Хяналтын самбар</h1>
        <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>LOVOL WT-130 · {format(new Date(), 'yyyy/MM/dd HH:mm')}</p>
      </div>

      {/* Alert */}
      {critical > 0 && (
        <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠</span> <strong>{critical} техник яаралтай PM</strong> шаардаж байна — 7 хоногийн дотор үйлчилгээнд оруулна уу
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Нийт техник', val: dash?.machineCount ?? 0, sub: `${dash?.activeCount ?? 0} ажиллаж байна`, accent: '#6366f1', icon: '🚛' },
          { label: 'Яаралтай PM', val: critical, sub: `${warning} ойрхон`, accent: '#f87171', icon: '⚠' },
          { label: 'Нээлттэй эвдрэл', val: dash?.openBreakdowns ?? 0, sub: 'Шийдвэрлэгдээгүй', accent: '#fbbf24', icon: '🔧' },
          { label: 'Нөөц дутагдал', val: dash?.lowStockCount ?? 0, sub: 'Яаралтай захиалах', accent: '#f87171', icon: '▤' },
          { label: 'Ажиллагаа', val: `${Math.round(((dash?.activeCount ?? 0) / (dash?.machineCount || 1)) * 100)}%`, sub: 'Флот', accent: '#4ade80', icon: '◎' },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: s.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '0.5rem' }}>
              <div>
                <p style={S.label}>{s.label}</p>
                <p style={S.val}>{s.val}</p>
                <p style={S.sub}>{s.sub}</p>
              </div>
              <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Fleet status + PM urgent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

        {/* Fleet SMR chart */}
        <div style={S.card}>
          <p style={S.secTitle}>🚛 Флотын SMR байдал</p>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fleet.slice(0, 12).map((m: any) => ({ name: m.parkNumber, smr: Math.round(m.estimatedSmr ?? m.currentSmr), urgency: m.urgency }))} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} ц`, 'SMR']} />
                <Bar dataKey="smr" radius={[3,3,0,0]}>
                  {fleet.slice(0, 12).map((m: any, i: number) => (
                    <Cell key={i} fill={m.urgency === 'critical' ? '#f87171' : m.urgency === 'warning' ? '#fbbf24' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
            {[['#f87171','Яаралтай'],['#fbbf24','Ойрхон'],['#6366f1','Хэвийн']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: c, display: 'inline-block' }}></span>{l}
              </div>
            ))}
          </div>
        </div>

        {/* Urgent PM list */}
        <div style={S.card}>
          <p style={S.secTitle}>🔧 Яаралтай PM ({urgentPMs.length} техник)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
            {schedule.slice(0, 8).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.625rem', background: '#0f1117', borderRadius: '8px', border: `1px solid ${m.urgency === 'critical' ? '#7f1d1d' : m.urgency === 'warning' ? '#78350f' : '#1e2132'}` }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#e2e8f0' }}>{m.parkNumber}</span>
                  <span style={{ fontSize: '0.7rem', color: '#818cf8', marginLeft: '6px' }}>PM{m.nextPMInterval}</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: m.urgency === 'critical' ? '#f87171' : m.urgency === 'warning' ? '#fbbf24' : '#64748b' }}>{m.nextPMDays}өд</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Breakdown chart + Low stock + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>

        {/* Breakdown by category */}
        <div style={S.card}>
          <p style={S.secTitle}>⚠ Эвдрэлийн ангилал</p>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bdByCategory} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#475569' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="тоо" fill="#f87171" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low stock */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column' }}>
          <p style={S.secTitle}>▤ Нөөц дутагдал ({lowStock.length})</p>
          {lowStock.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#4ade80' }}>✅ Бүх нөөц хангалттай</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '260px', paddingRight: '4px' }}>
              {lowStock.map((p: any) => (
                <div key={p.id} style={{ ...S.row, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: '#e2e8f0', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: p.stockQty <= 0 ? '#ef4444' : '#fbbf24', fontWeight: 600 }}>{p.stockQty}{p.unit}</span>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>/ {p.minStockQty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={S.card}>
          <p style={S.secTitle}>◎ Сүүлийн үйл ажиллагаа</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dash?.recentPMs?.slice(0, 3).map((pm: any) => (
              <div key={pm.id} style={{ padding: '0.4rem 0.625rem', background: '#0f1117', borderRadius: '6px', border: '1px solid #1e2132' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#e2e8f0' }}>{pm.machine.parkNumber}</span>
                  <span style={{ fontSize: '0.65rem', background: '#1e2d4a', color: '#818cf8', padding: '1px 6px', borderRadius: '4px' }}>PM{pm.pmType}</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#475569' }}>{format(new Date(pm.doneAt), 'MM/dd')}</span>
              </div>
            ))}
            {dash?.recentBreakdowns?.slice(0, 3).map((b: any) => (
              <div key={b.id} style={{ padding: '0.4rem 0.625rem', background: '#0f1117', borderRadius: '6px', border: '1px solid #2d1515' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#e2e8f0' }}>{b.machine.parkNumber}</span>
                  <span style={{ fontSize: '0.65rem', background: '#2d1515', color: '#f87171', padding: '1px 6px', borderRadius: '4px' }}>Эвдрэл</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{b.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
