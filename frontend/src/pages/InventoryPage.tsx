import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const card: React.CSSProperties = { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden' }
const th: React.CSSProperties = { padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#0f1117', borderBottom: '1px solid #1e2132' }
const inputStyle: React.CSSProperties = { width: '100%', background: '#0f1117', border: '1px solid #2d3148', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.82rem', boxSizing: 'border-box', outline: 'none' }

type Warehouse = { id: string; name: string; location?: string; _count?: { parts: number } }
type ImportResult = { updated: { name: string; qty: number }[]; created: { name: string; qty: number }[]; notFound: string[]; total: number; aiError?: string }

function WarehouseModal({
  initial, title, onClose, onSave,
}: {
  initial?: { name: string; location: string }
  title: string
  onClose: () => void
  onSave: (name: string, location: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#13151f', border: '1px solid #1e2132', borderRadius: '14px', padding: '1.5rem', width: '340px' }}>
        <h3 style={{ color: '#f1f5f9', margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 600 }}>{title}</h3>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Нэр *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Агуулах нэр" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Байршил</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Байршил (заавал биш)" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.45rem 1rem', background: 'transparent', border: '1px solid #2d3148', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>Болих</button>
          <button
            onClick={() => { if (name.trim()) { onSave(name.trim(), location.trim()); onClose() } }}
            style={{ padding: '0.45rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >Хадгалах</button>
        </div>
      </div>
    </div>
  )
}

function ImportResultPanel({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div style={{ background: '#0f1117', border: '1px solid #1e2132', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', background: '#1a1d2e', border: '1px solid #2d3158', borderRadius: '6px', padding: '2px 8px', color: '#818cf8', fontWeight: 600 }}>✦ AI шинжилгээ</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>Үр дүн</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
      </div>

      {result.aiError && (
        <div style={{ marginBottom: '0.6rem', padding: '0.4rem 0.75rem', background: '#2d1515', borderRadius: '6px', fontSize: '0.7rem', color: '#f87171' }}>
          AI алдаа: {result.aiError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
        {result.updated.length > 0 && <span style={{ color: '#4ade80' }}>✓ Шинэчлэгдсэн: <strong>{result.updated.length}</strong></span>}
        {result.created.length > 0 && <span style={{ color: '#818cf8' }}>✦ Шинээр нэмэгдсэн: <strong>{result.created.length}</strong></span>}
        <span style={{ color: '#fbbf24' }}>AI уншсан: <strong>{result.total}</strong></span>
        {result.notFound.length > 0 && <span style={{ color: '#f87171' }}>Тохирохгүй: <strong>{result.notFound.length}</strong></span>}
      </div>

      {result.created.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.67rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.3rem' }}>Шинээр бүртгэгдсэн сэлбэгүүд:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {result.created.map((u, i) => (
              <span key={i} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#1a1d2e', color: '#818cf8', border: '1px solid #2d3158' }}>
                {u.name} → {u.qty}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.updated.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: result.notFound.length > 0 ? '0.5rem' : 0 }}>
          {result.updated.map((u, i) => (
            <span key={i} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '9999px', background: '#0f2318', color: '#4ade80', border: '1px solid #166534' }}>
              {u.name} → {u.qty}
            </span>
          ))}
        </div>
      )}

      {result.notFound.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
          Тохирохгүй: {result.notFound.slice(0, 5).join(', ')}{result.notFound.length > 5 ? ` +${result.notFound.length - 5}` : ''}
        </div>
      )}
    </div>
  )
}

export default function InventoryPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showLow, setShowLow] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Warehouse | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then(r => r.data),
  })

  const { data: parts = [] } = useQuery<any[]>({
    queryKey: ['inventory', selectedWarehouse],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse)
      return api.get(`/inventory?${params}`).then(r => r.data)
    },
  })

  const addWarehouse = useMutation({
    mutationFn: (d: { name: string; location: string }) => api.post('/warehouses', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })

  const updateWarehouse = useMutation({
    mutationFn: ({ id, name, location }: { id: string; name: string; location: string }) =>
      api.patch(`/warehouses/${id}`, { name, location }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })

  const deleteWarehouse = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      if (selectedWarehouse === deleteConfirm?.id) setSelectedWarehouse(null)
      setDeleteConfirm(null)
    },
    onError: (e: any) => alert(e.response?.data?.error || 'Устгах боломжгүй'),
  })

  async function handleImport(file: File) {
    if (!selectedWarehouse) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/warehouses/${selectedWarehouse}/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      qc.invalidateQueries({ queryKey: ['inventory', selectedWarehouse] })
    } catch (e: any) {
      alert(e.response?.data?.error || 'Import амжилтгүй боллоо')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = showLow ? parts.filter((p: any) => p.stockQty <= p.minStockQty) : parts
  const lowCount = parts.filter((p: any) => p.stockQty <= p.minStockQty).length
  const activeWarehouse = warehouses.find(w => w.id === selectedWarehouse)

  return (
    <div>
      {/* Add modal */}
      {showAddModal && (
        <WarehouseModal
          title="Шинэ агуулах нэмэх"
          onClose={() => setShowAddModal(false)}
          onSave={(name, location) => addWarehouse.mutate({ name, location })}
        />
      )}

      {/* Edit modal */}
      {editWarehouse && (
        <WarehouseModal
          title="Агуулах засах"
          initial={{ name: editWarehouse.name, location: editWarehouse.location ?? '' }}
          onClose={() => setEditWarehouse(null)}
          onSave={(name, location) => updateWarehouse.mutate({ id: editWarehouse.id, name, location })}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#13151f', border: '1px solid #7f1d1d', borderRadius: '14px', padding: '1.5rem', width: '340px' }}>
            <h3 style={{ color: '#f87171', margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Агуулах устгах</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
              <strong style={{ color: '#f1f5f9' }}>{deleteConfirm.name}</strong> агуулахыг устгах уу?
              {(deleteConfirm._count?.parts ?? 0) > 0 && (
                <span style={{ display: 'block', marginTop: '0.5rem', color: '#fbbf24' }}>
                  ⚠ Энэ агуулахад {deleteConfirm._count?.parts} сэлбэг байна. Устгах боломжгүй.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '0.45rem 1rem', background: 'transparent', border: '1px solid #2d3148', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>Болих</button>
              {(deleteConfirm._count?.parts ?? 0) === 0 && (
                <button onClick={() => deleteWarehouse.mutate(deleteConfirm.id)} style={{ padding: '0.45rem 1rem', background: '#7f1d1d', border: 'none', borderRadius: '8px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Устгах</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Агуулах</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {activeWarehouse ? activeWarehouse.name : 'Бүх агуулах'}{lowCount > 0 ? ` · ${lowCount} дутагдалтай` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowLow(!showLow)} style={{ padding: '0.45rem 0.9rem', background: showLow ? '#2d1515' : 'transparent', color: showLow ? '#f87171' : '#64748b', border: `1px solid ${showLow ? '#7f1d1d' : '#2d3148'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}>
            {showLow ? 'Бүгдийг харах' : `⚠ Дутагдалтай (${lowCount})`}
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '0.45rem 0.9rem', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            + Агуулах нэмэх
          </button>
        </div>
      </div>

      {/* Warehouse tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => { setSelectedWarehouse(null); setImportResult(null) }}
          style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: `1px solid ${selectedWarehouse === null ? '#3b82f6' : '#2d3148'}`, background: selectedWarehouse === null ? '#1e3a5f' : 'transparent', color: selectedWarehouse === null ? '#93c5fd' : '#64748b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: selectedWarehouse === null ? 600 : 400 }}
        >
          Бүгд
        </button>
        {warehouses.map(w => {
          const isActive = selectedWarehouse === w.id
          return (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => { setSelectedWarehouse(w.id); setImportResult(null) }}
                style={{ padding: '0.4rem 0.9rem', borderRadius: isActive ? '8px 0 0 8px' : '8px', border: `1px solid ${isActive ? '#3b82f6' : '#2d3148'}`, borderRight: isActive ? 'none' : undefined, background: isActive ? '#1e3a5f' : 'transparent', color: isActive ? '#93c5fd' : '#64748b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: isActive ? 600 : 400 }}
              >
                {w.name}
                {(w._count?.parts ?? 0) > 0 && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: isActive ? '#60a5fa' : '#475569' }}>{w._count?.parts}</span>
                )}
              </button>
              {isActive && (
                <>
                  {/* Edit button */}
                  <button
                    onClick={() => setEditWarehouse(w)}
                    style={{ padding: '0.4rem 0.55rem', border: '1px solid #3b82f6', borderLeft: 'none', borderRight: 'none', background: '#1e3a5f', color: '#93c5fd', cursor: 'pointer', fontSize: '0.72rem', lineHeight: 1 }}
                    title="Нэр засах"
                  >✎</button>
                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirm(w)}
                    style={{ padding: '0.4rem 0.55rem', borderRadius: '0 8px 8px 0', border: '1px solid #3b82f6', borderLeft: 'none', background: '#1e3a5f', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}
                    title="Агуулах устгах"
                  >✕</button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Excel import bar — only when a warehouse is selected */}
      {selectedWarehouse && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.65rem 1rem', background: '#0f1117', borderRadius: '10px', border: '1px solid #1e2132' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Excel-ээр үлдэгдэл шинэчлэх</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#1a1d2e', border: '1px solid #2d3158', color: '#818cf8' }}>✦ Gemma 4 AI</span>
            {importing && (
              <div style={{ marginTop: '3px', fontSize: '0.67rem', color: '#818cf8' }}>AI Excel-ийг шинжилж, сэлбэгүүдтэй тохируулж байна...</div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{ padding: '0.4rem 0.9rem', background: importing ? '#1a1d2e' : '#14532d', color: importing ? '#818cf8' : '#86efac', border: `1px solid ${importing ? '#2d3158' : '#166534'}`, borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {importing ? '✦ AI шинжилж байна...' : '⬆ Excel оруулах'}
          </button>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <ImportResultPanel result={importResult} onClose={() => setImportResult(null)} />
      )}

      {/* Parts table */}
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Нэр', 'Ангилал', 'Нөөц', 'Доод хэмжээ', 'Байдал'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.82rem' }}>Сэлбэг байхгүй байна</td></tr>
            ) : filtered.map((p: any) => (
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
