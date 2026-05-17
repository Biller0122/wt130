import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const RISK_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }
const RISK_BG: Record<string, string> = { high: '#2d1515', medium: '#2d1f0a', low: '#0f2318' }
const RISK_LABEL: Record<string, string> = { high: 'Өндөр', medium: 'Дундаж', low: 'Бага' }

function ProxBadge({ prox, name }: { prox: number; name: string }) {
  const [bg, color, label] =
    prox === 0 ? ['#0f2318', '#4ade80', 'Ойрхон'] :
    prox <= 2  ? ['#2d1f0a', '#fbbf24', 'Дунд зайд'] :
                 ['#1a1d2e', '#64748b', 'Хол']
  return (
    <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '9999px', background: bg, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label} · {name}
    </span>
  )
}

function PartRow({ p }: { p: any }) {
  const [open, setOpen] = useState(false)

  if (p.status === 'ok') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', borderBottom: '1px solid #12141e', fontSize: '0.78rem' }}>
        <span style={{ color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>✓</span>
        <span style={{ color: '#e2e8f0', flex: 1 }}>{p.partName}</span>
        <span style={{ color: '#475569' }}>{p.needed} {p.unit}</span>
        <span style={{ color: '#475569', fontSize: '0.68rem' }}>PM{p.fromPM} · {p.daysUntil}х</span>
        <ProxBadge prox={p.sourceWarehouse.prox} name={p.sourceWarehouse.name} />
        <span style={{ fontSize: '0.68rem', color: '#4ade80' }}>Нөөц: {p.inStock}</span>
      </div>
    )
  }

  if (p.status === 'other_warehouse') {
    return (
      <div style={{ borderBottom: '1px solid #12141e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#fbbf24', fontWeight: 700, flexShrink: 0 }}>!</span>
          <span style={{ color: '#e2e8f0', flex: 1 }}>{p.partName}</span>
          <span style={{ color: '#475569' }}>{p.needed} {p.unit}</span>
          <span style={{ color: '#475569', fontSize: '0.68rem' }}>PM{p.fromPM} · {p.daysUntil}х</span>
          <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1f0a', color: '#fbbf24', fontWeight: 600 }}>
            Ойрхон агуулахад байхгүй
          </span>
          <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600 }}>
            → {p.sourceWarehouse.name}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#4ade80' }}>Нөөц: {p.inStock}</span>
        </div>
        <div style={{ padding: '0.3rem 0.75rem 0.5rem 2rem', fontSize: '0.72rem', color: '#64748b' }}>
          ⚠ Ойрхон агуулахад байхгүй тул <strong style={{ color: '#93c5fd' }}>{p.sourceWarehouse.name}</strong>
          {p.sourceWarehouse.location ? ` (${p.sourceWarehouse.location})` : ''}-аас татаж авна уу
        </div>
      </div>
    )
  }

  // status === 'unavailable'
  return (
    <div style={{ borderBottom: '1px solid #12141e' }}>
      <div
        onClick={() => p.alternatives.length > 0 && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', fontSize: '0.78rem', cursor: p.alternatives.length > 0 ? 'pointer' : 'default' }}
      >
        <span style={{ color: '#f87171', fontWeight: 700, flexShrink: 0 }}>✕</span>
        <span style={{ color: '#e2e8f0', flex: 1 }}>{p.partName}</span>
        <span style={{ color: '#475569' }}>{p.needed} {p.unit}</span>
        <span style={{ color: '#475569', fontSize: '0.68rem' }}>PM{p.fromPM} · {p.daysUntil}х</span>
        <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1515', color: '#f87171', fontWeight: 600 }}>
          {p.alternatives.length > 0 ? `Өөр агуулахаас авах боломжтой (${p.alternatives.length})` : 'Нөөц байхгүй'}
        </span>
        {p.alternatives.length > 0 && <span style={{ color: '#475569', fontSize: '0.72rem' }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && p.alternatives.length > 0 && (
        <div style={{ background: '#0a0c13', padding: '0.5rem 0.75rem 0.5rem 2rem', borderTop: '1px solid #1e2132' }}>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '0 0 0.4rem' }}>Санал болгох агуулах:</p>
          {p.alternatives.map((alt: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#6366f1', fontWeight: 600 }}>→</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{alt.name}</span>
              {alt.location && <span style={{ color: '#475569' }}>({alt.location})</span>}
              <span style={{ color: '#4ade80' }}>Нөөц: {alt.inStock} {p.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MachineAdvisoryCard({ m }: { m: any }) {
  const [open, setOpen] = useState(true)
  const warnCount = m.partAdvisories.filter((p: any) => p.status !== 'ok').length
  const unavailCount = m.partAdvisories.filter((p: any) => p.status === 'unavailable').length
  const highPreds = m.predictions.filter((p: any) => p.riskLevel === 'high').length

  return (
    <div style={{ background: '#13151f', borderRadius: '12px', border: `1px solid ${unavailCount > 0 ? '#7f1d1d' : warnCount > 0 ? '#78350f' : '#1e2132'}`, overflow: 'hidden', marginBottom: '0.75rem' }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: '#0f1117', borderBottom: open ? '1px solid #1e2132' : 'none' }}
      >
        <span>🚛</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.875rem' }}>#{m.parkNumber}</span>
          {m.location && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>📍 {m.location}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {m.nearestWarehouse && (
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#1e2340', color: '#818cf8', fontWeight: 600 }}>
              🏭 {m.nearestWarehouse.name}
            </span>
          )}
          {unavailCount > 0 && (
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1515', color: '#f87171', fontWeight: 600 }}>
              ✕ {unavailCount} нөөцгүй
            </span>
          )}
          {warnCount > unavailCount && (
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1f0a', color: '#fbbf24', fontWeight: 600 }}>
              ! {warnCount - unavailCount} өөр агуулах
            </span>
          )}
          {highPreds > 0 && (
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#2d1515', color: '#f87171', fontWeight: 600 }}>
              🔴 {highPreds} эрсдэл
            </span>
          )}
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div>
          {/* Nearest warehouse info */}
          {m.nearestWarehouse && (
            <div style={{ padding: '0.5rem 1rem', background: '#0a0c13', borderBottom: '1px solid #1e2132', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏭</span>
              <span>Ойрхон агуулах:</span>
              <span style={{ color: '#93c5fd', fontWeight: 600 }}>{m.nearestWarehouse.name}</span>
              {m.nearestWarehouse.location && <span>({m.nearestWarehouse.location})</span>}
              <span style={{ marginLeft: '0.25rem', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '9999px', background: m.nearestWarehouse.prox === 0 ? '#0f2318' : m.nearestWarehouse.prox <= 2 ? '#2d1f0a' : '#1a1d2e', color: m.nearestWarehouse.prox === 0 ? '#4ade80' : m.nearestWarehouse.prox <= 2 ? '#fbbf24' : '#64748b' }}>
                {m.nearestWarehouse.prox === 0 ? 'Ижил байршил' : m.nearestWarehouse.prox <= 2 ? 'Ойролцоо' : 'Хол'}
              </span>
            </div>
          )}

          {/* Part advisories */}
          {m.partAdvisories.length > 0 ? (
            <div>
              <div style={{ padding: '0.4rem 0.75rem', background: '#080a0f', borderBottom: '1px solid #1e2132', display: 'flex', gap: '1rem', fontSize: '0.62rem', color: '#334155' }}>
                <span style={{ color: '#4ade80' }}>✓ Ойрхон агуулахд байгаа</span>
                <span style={{ color: '#fbbf24' }}>! Өөр агуулахаас авах</span>
                <span style={{ color: '#f87171' }}>✕ Нөөц байхгүй (дарж дэлгэрэнгүй харах)</span>
              </div>
              {m.partAdvisories.map((p: any, i: number) => <PartRow key={i} p={p} />)}
            </div>
          ) : (
            <div style={{ padding: '1rem', fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
              60 хоногт PM хуваарь байхгүй
            </div>
          )}

          {/* AI Predictions */}
          {m.predictions.length > 0 && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #1e2132' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>✦ AI таамаглал</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {m.predictions.map((pred: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '8px', background: RISK_BG[pred.riskLevel], borderLeft: `3px solid ${RISK_COLOR[pred.riskLevel]}` }}>
                    <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(0,0,0,0.3)', color: RISK_COLOR[pred.riskLevel], fontWeight: 600, flexShrink: 0, marginTop: '1px' }}>{RISK_LABEL[pred.riskLevel]}</span>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{pred.title}</p>
                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '3px 0 0', lineHeight: 1.5 }}>{pred.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdvisoryPage() {
  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['advisory'],
    queryFn: () => api.get('/advisory').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const total = data.length
  const unavailMachines = data.filter(m => m.partAdvisories.some((p: any) => p.status === 'unavailable')).length
  const warnMachines = data.filter(m => m.partAdvisories.some((p: any) => p.status === 'other_warehouse')).length
  const okMachines = data.filter(m => m.partAdvisories.every((p: any) => p.status === 'ok')).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Санамж</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Машины байршлаас ойрхон агуулахын сэлбэг хангамжийн зөвлөмж · 60 хоногийн хугацаа
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid #2d3148', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem' }}
        >↻ Шинэчлэх</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Бүх техникийн байршил болон агуулахын мэдээллийг боловсруулж байна...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { l: 'Нийт техник', v: total, c: '#818cf8', bg: '#1e2340', i: '🚛' },
              { l: 'Сэлбэг хангалттай', v: okMachines, c: '#4ade80', bg: '#0f2318', i: '✓' },
              { l: 'Өөр агуулахаас авах', v: warnMachines, c: '#fbbf24', bg: '#2d1f0a', i: '!' },
              { l: 'Нөөцгүй сэлбэг байгаа', v: unavailMachines, c: '#f87171', bg: '#2d1515', i: '✕' },
            ].map(s => (
              <div key={s.l} style={{ background: '#13151f', borderRadius: '10px', border: '1px solid #1e2132', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{s.l}</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: '4px 0 0' }}>{s.v}</p>
                </div>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: s.c, fontWeight: 700 }}>{s.i}</div>
              </div>
            ))}
          </div>

          {data.length === 0 ? (
            <div style={{ background: '#13151f', border: '1px dashed #2d3148', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>📋</div>
              <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
                60 хоногт PM хуваарь болон таамаглал байхгүй байна
              </p>
            </div>
          ) : data.map((m: any) => <MachineAdvisoryCard key={m.id} m={m} />)}
        </>
      )}
    </div>
  )
}
