import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden', marginBottom: '0.75rem' }
const th: React.CSSProperties = { padding: '0.55rem 0.875rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132', whiteSpace: 'nowrap' }
const td = (warn?: boolean): React.CSSProperties => ({ padding: '0.6rem 0.875rem', fontSize: '0.78rem', color: warn ? '#f87171' : '#e2e8f0', fontWeight: warn ? 700 : 400, borderBottom: '1px solid #12141e' })

const RISK_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }
const RISK_BG: Record<string, string> = { high: '#2d1515', medium: '#2d1f0a', low: '#0f2318' }
const RISK_LABEL: Record<string, string> = { high: 'Өндөр', medium: 'Дундаж', low: 'Бага' }
const PM_URGENCY: Record<string, string> = { critical: '#f87171', warning: '#fbbf24', normal: '#4ade80' }

export default function ProcurementPage() {
  const [months, setMonths] = useState<1 | 2 | 3 | null>(null)
  const [fetchMonths, setFetchMonths] = useState<number | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['procurement', fetchMonths],
    queryFn: () => api.get(`/pm/procurement?months=${fetchMonths}`).then(r => r.data),
    enabled: fetchMonths !== null,
  })

  const machines: any[] = data?.machines ?? []
  const consolidated: any[] = data?.consolidatedParts ?? []
  const toOrderCount = consolidated.filter(p => p.toOrder > 0).length
  const totalMachines = machines.length
  const highRiskCount = machines.reduce((n: number, m: any) =>
    n + m.predictions.filter((p: any) => p.riskLevel === 'high').length, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Татан авалтын төлөвлөгөө</h1>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          PM хуваарь болон AI таамаглалд суурилсан сэлбэгийн захиалгын дүгнэлт
        </p>
      </div>

      {/* Month selector */}
      <div style={{ background: '#13151f', border: '1px solid #1e2132', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.875rem', marginTop: 0 }}>
          Хэдэн сарын хугацааг тооцоолох вэ?
        </p>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          {([1, 2, 3] as const).map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '10px', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 700,
                border: `1px solid ${months === m ? '#6366f1' : '#2d3148'}`,
                background: months === m ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#0f1117',
                color: months === m ? '#fff' : '#64748b',
                transition: 'all 0.15s',
              }}
            >{m} сар</button>
          ))}
          <button
            onClick={() => { if (months) setFetchMonths(months) }}
            disabled={!months || isFetching}
            style={{
              marginLeft: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '10px', cursor: months && !isFetching ? 'pointer' : 'not-allowed',
              fontSize: '0.82rem', fontWeight: 600, border: 'none',
              background: months && !isFetching ? '#6366f1' : '#1e2132',
              color: months && !isFetching ? '#fff' : '#475569',
            }}
          >
            {isFetching ? '⏳ Тооцоолж байна...' : '✦ Тооцоолох'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Бүх техникийн мэдээллийг боловсруулж байна...
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { l: `${data.months} сарын хугацаа`, v: `${data.horizonDays} өдөр`, c: '#818cf8', bg: '#1e2340', i: '📅' },
              { l: 'PM хуваарьт техник', v: totalMachines, c: '#60a5fa', bg: '#0f2040', i: '🚛' },
              { l: 'Өндөр эрсдэл', v: highRiskCount, c: '#f87171', bg: '#2d1515', i: '🔴' },
              { l: 'Захиалах сэлбэг', v: toOrderCount, c: '#fbbf24', bg: '#2d1f0a', i: '📦' },
            ].map(s => (
              <div key={s.l} style={{ background: '#13151f', borderRadius: '10px', border: '1px solid #1e2132', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{s.l}</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: '4px 0 0' }}>{s.v}</p>
                </div>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{s.i}</div>
              </div>
            ))}
          </div>

          {/* Per-machine breakdown */}
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.75rem' }}>
            Машин тус бүрийн дүгнэлт
          </h2>
          {machines.length === 0 ? (
            <div style={{ ...card, padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                Сонгосон хугацаанд PM хуваарь эсвэл таамаглал байхгүй байна
              </p>
            </div>
          ) : machines.map((machine: any) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}

          {/* Consolidated parts table */}
          {consolidated.length > 0 && (
            <>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '1.5rem 0 0.75rem' }}>
                Нэгтгэсэн захиалгын жагсаал
              </h2>
              <div style={card}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Сэлбэгийн нэр', 'Нийт хэрэгтэй', 'Агуулахад байгаа', 'Захиалах', ''].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consolidated.map((p: any) => (
                      <tr key={p.partId}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={td()}>▤ {p.partName}</td>
                        <td style={td()}>{p.totalQty} {p.unit}</td>
                        <td style={td(p.inStock < p.totalQty)}>{p.inStock} {p.unit}</td>
                        <td style={td(p.toOrder > 0)}>
                          {p.toOrder > 0 ? `${p.toOrder} ${p.unit}` : '—'}
                        </td>
                        <td style={{ padding: '0.6rem 0.875rem', borderBottom: '1px solid #12141e' }}>
                          {p.toOrder > 0 ? (
                            <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1f0a', color: '#fbbf24', fontWeight: 600 }}>Захиалах</span>
                          ) : (
                            <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '9999px', background: '#0f2318', color: '#4ade80', fontWeight: 600 }}>Хангалттай</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {!data && !isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#334155' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>📦</div>
          <p style={{ fontSize: '0.875rem' }}>Сар сонгоод тооцоолох товч дарна уу</p>
        </div>
      )}
    </div>
  )
}

function MachineCard({ machine }: { machine: any }) {
  const [open, setOpen] = useState(true)
  const hasParts = machine.requiredParts.length > 0
  const highPreds = machine.predictions.filter((p: any) => p.riskLevel === 'high')

  return (
    <div style={card}>
      {/* Machine header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: '#0f1117', borderBottom: open ? '1px solid #1e2132' : 'none' }}
      >
        <span style={{ fontSize: '1rem' }}>🚛</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.875rem' }}>#{machine.parkNumber}</span>
          {machine.location && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#475569' }}>{machine.location}</span>}
          <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', color: '#64748b' }}>
            {machine.currentSmr.toLocaleString()} SMR · {machine.dailyAvgSmr} цаг/өдөр
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {machine.upcomingPMs.map((pm: any) => (
            <span key={pm.interval} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '9999px', background: RISK_BG[pm.urgency === 'critical' ? 'high' : pm.urgency === 'warning' ? 'medium' : 'low'], color: PM_URGENCY[pm.urgency], fontWeight: 600 }}>
              PM{pm.interval} {pm.daysUntil}х
            </span>
          ))}
          {highPreds.length > 0 && (
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1515', color: '#f87171', fontWeight: 600 }}>
              ⚠ {highPreds.length} өндөр эрсдэл
            </span>
          )}
          <span style={{ color: '#475569', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: hasParts ? '1fr 1fr' : '1fr', gap: '1rem' }}>

            {/* AI Predictions */}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>✦ AI таамаглал</p>
              {machine.predictions.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: '#334155', margin: 0 }}>Таамаглал байхгүй</p>
              ) : machine.predictions.map((pred: any) => (
                <div key={pred.id} style={{ marginBottom: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '8px', background: RISK_BG[pred.riskLevel], borderLeft: `3px solid ${RISK_COLOR[pred.riskLevel]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(0,0,0,0.3)', color: RISK_COLOR[pred.riskLevel], fontWeight: 600 }}>{RISK_LABEL[pred.riskLevel]}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9' }}>{pred.title}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{pred.recommendation}</p>
                </div>
              ))}
            </div>

            {/* Required parts from PM kits */}
            {hasParts && (
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>▤ Шаардлагатай сэлбэг</p>
                <div style={{ background: '#0f1117', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, background: 'transparent' }}>Нэр</th>
                        <th style={{ ...th, background: 'transparent' }}>PM</th>
                        <th style={{ ...th, background: 'transparent' }}>Тоо</th>
                        <th style={{ ...th, background: 'transparent' }}>Нөөц</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machine.requiredParts.map((p: any, i: number) => (
                        <tr key={i}>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#e2e8f0', borderBottom: '1px solid #1a1d2e' }}>{p.partName}</td>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.7rem', color: '#6366f1', borderBottom: '1px solid #1a1d2e' }}>PM{p.fromPM}</td>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#f1f5f9', borderBottom: '1px solid #1a1d2e' }}>{p.quantity} {p.unit}</td>
                          <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', borderBottom: '1px solid #1a1d2e', color: p.inStock < p.quantity ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                            {p.inStock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
