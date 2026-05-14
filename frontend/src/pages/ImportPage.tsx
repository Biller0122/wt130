import { useState, useRef } from 'react'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

type ImportType = 'machines' | 'breakdowns' | 'pm'
type Step = 'upload' | 'preview' | 'mapping' | 'done'

interface SheetPreview { name: string; rowCount: number; preview: string[][] }
interface ImportResult { success: boolean; created?: number; updated?: number; imported?: number; skipped: number; errors?: string[] }

const TYPES: { id: ImportType; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'machines',   icon: '🚛', label: 'Техникийн жагсаалт', desc: 'Парк дугаар, модель, байршил, SMR', color: '#6366f1' },
  { id: 'breakdowns', icon: '⚠',  label: 'Эвдрэлийн түүх',    desc: 'Ангилал, тайлбар, огноо, зогссон цаг', color: '#f87171' },
  { id: 'pm',         icon: '🔧', label: 'PM бүртгэл',         desc: 'PM төрөл, SMR, огноо, механик', color: '#4ade80' },
]

export default function ImportPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<ImportType>('machines')
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<SheetPreview[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const handleFile = async (f: File) => {
    setFile(f); setError(''); setLoading(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const { data } = await api.post('/import/preview', fd)
      setSheets(data.sheets)
      setSelectedSheet(data.sheets[0]?.name ?? '')
      setStep('preview')
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Файл уншихад алдаа гарлаа')
    } finally { setLoading(false) }
  }

  const handleImport = async () => {
    if (!file || !selectedSheet) return
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('sheetName', selectedSheet)
      const { data } = await api.post(`/import/${type}`, fd)
      setResult(data)
      setStep('done')
      qc.invalidateQueries({ queryKey: ['fleet'] })
      qc.invalidateQueries({ queryKey: ['breakdowns'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Импорт хийхэд алдаа гарлаа')
    } finally { setLoading(false) }
  }

  const reset = () => { setStep('upload'); setFile(null); setSheets([]); setResult(null); setError('') }

  const selectedSheetData = sheets.find(s => s.name === selectedSheet)
  const cfg = TYPES.find(t => t.id === type)!

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Excel импорт</h1>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>Excel файлаас өгөгдөл шууд оруулах</p>
      </div>

      {/* Import type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {TYPES.map(t => (
          <div key={t.id} onClick={() => { setType(t.id); reset() }}
            style={{ background: '#13151f', borderRadius: '12px', border: `1px solid ${type === t.id ? t.color : '#1e2132'}`, padding: '1rem', cursor: 'pointer', transition: 'all 0.15s', opacity: type === t.id ? 1 : 0.6 }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{t.icon}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>{t.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = cfg.color }}
          onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d3148' }}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); (e.currentTarget as HTMLElement).style.borderColor = '#2d3148' }}
          style={{ background: '#13151f', border: '2px dashed #2d3148', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📂</div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Excel файл дарж сонгох эсвэл чирж оруулах</p>
          <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.375rem' }}>.xlsx, .xls формат · Хамгийн ихдээ 20MB</p>
          {loading && <p style={{ color: cfg.color, fontSize: '0.8rem', marginTop: '0.75rem' }}>⏳ Файл уншиж байна...</p>}
        </div>
      )}

      {/* Step: Preview + Sheet selection */}
      {step === 'preview' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📄 <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{file?.name}</span>
              <span style={{ color: '#475569' }}>· {sheets.length} sheet</span>
            </div>
            <button onClick={reset} style={{ padding: '0.5rem 0.875rem', background: 'transparent', border: '1px solid #2d3148', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Цуцлах</button>
          </div>

          {/* Sheet tabs */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {sheets.map(s => (
              <button key={s.name} onClick={() => setSelectedSheet(s.name)}
                style={{ padding: '0.375rem 0.875rem', borderRadius: '8px', border: '1px solid', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', background: selectedSheet === s.name ? '#1e2d4a' : 'transparent', color: selectedSheet === s.name ? '#818cf8' : '#64748b', borderColor: selectedSheet === s.name ? '#2d3d6a' : '#2d3148' }}>
                {s.name} <span style={{ opacity: 0.6 }}>({s.rowCount} мөр)</span>
              </button>
            ))}
          </div>

          {/* Preview table */}
          {selectedSheetData && (
            <div style={{ background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1e2132', fontSize: '0.75rem', color: '#64748b' }}>
                Дээж — эхний 4 мөр
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <tbody>
                    {selectedSheetData.preview.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid #1a1d2e', background: ri === 0 ? '#0f1117' : 'transparent' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '0.5rem 0.875rem', color: ri === 0 ? '#818cf8' : '#94a3b8', fontWeight: ri === 0 ? 600 : 400, whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cell || <span style={{ color: '#2d3148' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import info */}
          <div style={{ background: '#1a1d2e', border: `1px solid ${cfg.color}33`, borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>
              {cfg.icon} {cfg.label} импортын тайлбар
            </div>
            {type === 'machines' && <div>Хайх баганууд: <span style={{ color: cfg.color }}>Парк дугаар</span>, Модель, Байршил, SMR/Мот цаг</div>}
            {type === 'breakdowns' && <div>Хайх баганууд: <span style={{ color: cfg.color }}>Парк дугаар</span>, Эвдрэл ангилал, Тайлбар/Дуудлага, Огноо, Мото цаг</div>}
            {type === 'pm' && <div>Хайх баганууд: <span style={{ color: cfg.color }}>Парк дугаар</span>, PM төрөл, SMR/Мот цаг, Огноо, Механик</div>}
            <div style={{ marginTop: '0.375rem', color: '#475569' }}>Системд байгаа техникүүдтэй парк дугаараар тохирч оруулна</div>
          </div>

          <button onClick={handleImport} disabled={loading}
            style={{ padding: '0.625rem 1.5rem', background: loading ? '#2d3148' : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            {loading ? '⏳ Импорт хийж байна...' : `↑ ${cfg.label} импортлох`}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div style={{ background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0f2318', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✅</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>Импорт амжилттай боллоо</div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>{cfg.label}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {type === 'machines' && <>
              <div style={{ background: '#0f2318', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>{result.created ?? 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>Шинэ техник</div>
              </div>
              <div style={{ background: '#1e2d4a', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#818cf8' }}>{result.updated ?? 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>Шинэчлэгдсэн</div>
              </div>
            </>}
            {(type === 'breakdowns' || type === 'pm') && (
              <div style={{ background: '#0f2318', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>{result.imported ?? 0}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>Импортлогдсон</div>
              </div>
            )}
            <div style={{ background: '#2d1f0a', borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{result.skipped}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>Алгасагдсан</div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div style={{ background: '#2d1515', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, marginBottom: '0.375rem' }}>Алдааны мэдээлэл:</div>
              {result.errors.map((e, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#ef4444', marginBottom: '2px' }}>{e}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={reset} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>↑ Дахин импортлох</button>
            <a href={type === 'machines' ? '/fleet' : type === 'breakdowns' ? '/breakdowns' : '/pm'} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#64748b', border: '1px solid #2d3148', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Үр дүнг харах →</a>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.875rem 1rem', marginTop: '1rem', fontSize: '0.8rem', color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
