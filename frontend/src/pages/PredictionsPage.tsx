import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.25rem', marginBottom: '0.75rem' }
const RISK: Record<string, [string,string,string,string]> = {
  high:   ['#2d1515','#f87171','#7f1d1d','🔴'],
  medium: ['#2d1f0a','#fbbf24','#78350f','🟡'],
  low:    ['#0f2318','#4ade80','#14532d','🟢'],
}
function PredCard({ pred, onDismiss }: { pred: any; onDismiss: (id: string) => void }) {
  const [bg, text, border, icon] = RISK[pred.riskLevel] ?? RISK.medium
  const label = pred.riskLevel === 'high' ? 'Өндөр эрсдэл' : pred.riskLevel === 'low' ? 'Бага эрсдэл' : 'Дундаж эрсдэл'
  return (
    <div style={{ background: '#13151f', borderRadius: '12px', border: `1px solid ${border}`, padding: '1.25rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f1f5f9' }}>{pred.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ background: bg, color: text, fontSize: '0.65rem', padding: '3px 10px', borderRadius: '9999px', fontWeight: 600 }}>{label}</span>
          <button onClick={() => onDismiss(pred.id)} style={{ background: 'transparent', border: '1px solid #2d3148', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.7rem', color: '#475569' }}>✕</button>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.75rem', lineHeight: 1.6 }}>{pred.description}</p>
      <div style={{ background: '#0f1117', borderRadius: '8px', padding: '0.625rem 0.875rem', borderLeft: '3px solid #6366f1' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Зөвлөмж</span>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0', lineHeight: 1.5 }}>{pred.recommendation}</p>
      </div>
    </div>
  )
}
export default function PredictionsPage() {
  const qc = useQueryClient()
  const [sel, setSel] = useState('')
  const [gen, setGen] = useState('')
  const { data: machines = [] } = useQuery({ queryKey: ['machines-list'], queryFn: () => api.get('/machines').then(r => r.data) })
  const { data: preds = [], isLoading } = useQuery({ queryKey: ['preds', sel], queryFn: () => sel ? api.get(`/predictions/machine/${sel}`).then(r => r.data) : Promise.resolve([]), enabled: !!sel })
  const { data: allPreds = [] } = useQuery({
    queryKey: ['preds-all', machines.length],
    queryFn: async () => {
      const all: any[] = []
      for (const m of machines.slice(0, 6)) {
        try { const p = await api.get(`/predictions/machine/${m.id}`).then(r => r.data); p.forEach((x: any) => all.push({ ...x, parkNumber: m.parkNumber, machineId: m.id })) } catch {}
      }
      return all
    },
    enabled: machines.length > 0 && !sel
  })
  const generate = useMutation({ mutationFn: (id: string) => { setGen(id); return api.post(`/predictions/generate/${id}`) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['preds'] }); qc.invalidateQueries({ queryKey: ['preds-all'] }); setGen('') }, onError: () => setGen('') })
  const dismiss = useMutation({ mutationFn: (id: string) => api.patch(`/predictions/${id}/dismiss`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['preds'] }); qc.invalidateQueries({ queryKey: ['preds-all'] }) } })
  const display = sel ? preds : allPreds
  const high = display.filter((p: any) => p.riskLevel === 'high').length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Эвдрэлийн таамаглал</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>AI шинжилгээнд суурилсан эрсдэлийн үнэлгээ</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={sel} onChange={e => setSel(e.target.value)} style={{ padding: '0.5rem 0.75rem', background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0', minWidth: '140px' }}>
            <option value="">Бүх техник</option>
            {machines.map((m: any) => <option key={m.id} value={m.id}>{m.parkNumber}</option>)}
          </select>
          {sel && <button onClick={() => generate.mutate(sel)} disabled={!!gen} style={{ padding: '0.5rem 1rem', background: gen ? '#2d3148' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: gen ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>{gen ? '⏳ Боловсруулж байна...' : '✦ AI таамаглал авах'}</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { l: 'Нийт', v: display.length, c: '#818cf8', bg: '#1e2d4a', i: '🔮' },
          { l: 'Өндөр эрсдэл', v: display.filter((p: any) => p.riskLevel === 'high').length, c: '#f87171', bg: '#2d1515', i: '🔴' },
          { l: 'Дундаж', v: display.filter((p: any) => p.riskLevel === 'medium').length, c: '#fbbf24', bg: '#2d1f0a', i: '🟡' },
          { l: 'Бага', v: display.filter((p: any) => p.riskLevel === 'low').length, c: '#4ade80', bg: '#0f2318', i: '🟢' },
        ].map(s => (
          <div key={s.l} style={{ background: '#13151f', borderRadius: '10px', border: '1px solid #1e2132', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{s.l}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: '4px 0 0' }}>{s.v}</p>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{s.i}</div>
          </div>
        ))}
      </div>

      {high > 0 && <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#f87171' }}>⚠ {high} өндөр эрсдэлтэй таамаглал байна — нэн даруй анхаарал хандуулна уу</div>}

      {display.length === 0 && !sel ? (
        <div style={{ background: '#13151f', borderRadius: '12px', border: '1px dashed #2d3148', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>🔮</div>
          <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.875rem' }}>Техник сонгоод AI таамаглал авна уу</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {machines.slice(0, 4).map((m: any) => (
              <button key={m.id} onClick={() => { setSel(m.id); generate.mutate(m.id) }} disabled={!!gen}
                style={{ padding: '0.5rem 0.875rem', background: '#1e2d4a', color: '#818cf8', border: '1px solid #2d3d6a', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                {gen === m.id ? '⏳ ...' : `✦ ${m.parkNumber}`}
              </button>
            ))}
          </div>
        </div>
      ) : sel ? (
        isLoading ? <div style={{ color: '#64748b', padding: '2rem' }}>Ачааллаж байна...</div> :
        preds.length === 0 ? (
          <div style={{ background: '#13151f', borderRadius: '12px', border: '1px dashed #2d3148', padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b', margin: '0 0 1rem', fontSize: '0.875rem' }}>Энэ техникт таамаглал байхгүй байна</p>
            <button onClick={() => generate.mutate(sel)} disabled={!!gen} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>{gen ? '⏳ ...' : '✦ AI таамаглал авах'}</button>
          </div>
        ) : preds.map((p: any) => <PredCard key={p.id} pred={p} onDismiss={id => dismiss.mutate(id)} />)
      ) : (
        <div>
          {machines.map((m: any) => {
            const mp = allPreds.filter((p: any) => p.machineId === m.id)
            if (!mp.length) return null
            return (
              <div key={m.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #1e2132' }}>
                  <span>🚛</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9' }}>{m.parkNumber}</span>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>· {mp.length} таамаглал</span>
                  <button onClick={() => { setSel(m.id); generate.mutate(m.id) }} disabled={!!gen} style={{ marginLeft: 'auto', padding: '3px 10px', background: '#1e2d4a', color: '#818cf8', border: '1px solid #2d3d6a', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>{gen === m.id ? '⏳ ...' : '↻ Шинэчлэх'}</button>
                </div>
                {mp.map((p: any) => <PredCard key={p.id} pred={p} onDismiss={id => dismiss.mutate(id)} />)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
