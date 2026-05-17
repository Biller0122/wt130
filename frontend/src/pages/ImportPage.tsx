import { useState, useRef } from 'react'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

type ImportType = 'machines' | 'breakdowns' | 'pm' | 'parts'
type Step = 'upload' | 'preview' | 'done'

interface SheetPreview { name: string; rowCount: number; preview: string[][] }
interface ImportResult { success: boolean; created?: number; updated?: number; imported?: number; skipped: number; errors?: string[] }

const TYPES: { id: ImportType; icon: string; label: string; desc: string; color: string; fields: string[] }[] = [
  {
    id: 'machines', icon: '🚛', label: 'Техникийн жагсаалт', color: '#6366f1',
    desc: 'Парк дугаар, загвар, байршил, SMR',
    fields: ['Парк дугаар *', 'Загвар', 'Мотор цаг (SMR)', 'Байршил', 'Өдрийн дундаж SMR'],
  },
  {
    id: 'breakdowns', icon: '⚠', label: 'Эвдрэлийн түүх', color: '#f87171',
    desc: 'Ангилал, тайлбар, огноо, зогссон цаг',
    fields: ['Парк дугаар *', 'Ангилал *', 'Тайлбар', 'Огноо *', 'SMR', 'Зогссон цаг (ц)'],
  },
  {
    id: 'pm', icon: '🔧', label: 'PM бүртгэл', color: '#4ade80',
    desc: 'PM 250/500/1000/2000, SMR, огноо, механик',
    fields: ['Парк дугаар *', 'PM төрөл * (250/500/1000/2000)', 'SMR *', 'Огноо *', 'Механик'],
  },
  {
    id: 'parts', icon: '▤', label: 'Сэлбэгийн каталог', color: '#fbbf24',
    desc: 'Нэр, ангилал, нөөц, агуулах',
    fields: ['Код', 'Нэр *', 'Ангилал *', 'Нэгж *', 'Нөөц тоо', 'Доод нөөц', 'Нэгж үнэ', 'Агуулах'],
  },
]

const PART_CATEGORIES = [
  'OIL_FILTER', 'FUEL_FILTER', 'AIR_FILTER', 'TRANSMISSION_FILTER', 'HYDRAULIC_FILTER',
  'ENGINE_OIL', 'TRANSMISSION_FLUID', 'HYDRAULIC_FLUID', 'COOLANT', 'BELT',
  'ELECTRICAL', 'TIRE_PARTS', 'DRIVETRAIN', 'BRAKE', 'STRUCTURAL', 'OTHER',
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

  const cfg = TYPES.find(t => t.id === type)!

  const downloadTemplate = () => {
    api.get(`/import/template/${type}`, { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_template.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

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
      setResult(data); setStep('done')
      qc.invalidateQueries({ queryKey: ['fleet'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['breakdowns'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Импорт хийхэд алдаа гарлаа')
    } finally { setLoading(false) }
  }

  const reset = () => { setStep('upload'); setFile(null); setSheets([]); setResult(null); setError('') }
  const selectedSheetData = sheets.find(s => s.name === selectedSheet)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Excel импорт</h1>
          <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>Excel файлаас өгөгдөл шууд оруулах</p>
        </div>
      </div>

      {/* Type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {TYPES.map(t => (
          <div key={t.id} onClick={() => { setType(t.id); reset() }}
            style={{ background: '#13151f', borderRadius: '12px', border: `1px solid ${type === t.id ? t.color : '#1e2132'}`, padding: '0.875rem', cursor: 'pointer', opacity: type === t.id ? 1 : 0.6, transition: 'all 0.15s' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{t.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>{t.label}</div>
            <div style={{ fontSize: '0.68rem', color: '#475569' }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Format guide + template download */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2132', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>
            {cfg.icon} {cfg.label} — шаардлагатай баганууд
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {cfg.fields.map(f => (
              <span key={f} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', background: f.endsWith('*') ? `${cfg.color}20` : '#1a1d2e', color: f.endsWith('*') ? cfg.color : '#64748b', fontWeight: f.endsWith('*') ? 600 : 400 }}>
                {f}
              </span>
            ))}
          </div>
          {type === 'parts' && (
            <div style={{ marginTop: '0.625rem', fontSize: '0.68rem', color: '#475569' }}>
              <strong style={{ color: '#94a3b8' }}>Ангилалын утгууд:</strong>{' '}
              {PART_CATEGORIES.join(' · ')}
            </div>
          )}
          <p style={{ fontSize: '0.68rem', color: '#334155', margin: '0.4rem 0 0' }}>
            * тэмдэгтэй багана заавал шаардлагатай. Толгой мөр 10 мөрийн дотор байвал автоматаар олно.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          style={{ padding: '0.5rem 1rem', background: '#1a1d2e', border: `1px solid ${cfg.color}44`, borderRadius: '8px', color: cfg.color, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          ↓ Загвар татах
        </button>
      </div>

      {/* Upload area */}
      {step === 'upload' && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = cfg.color }}
          onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d3148' }}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); (e.currentTarget as HTMLElement).style.borderColor = '#2d3148' }}
          style={{ background: '#13151f', border: '2px dashed #2d3148', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.4 }}>📂</div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Excel файл дарж сонгох эсвэл чирж оруулах</p>
          <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.375rem' }}>.xlsx · .xls · .csv · Хамгийн ихдээ 20MB</p>
          {loading && <p style={{ color: cfg.color, fontSize: '0.8rem', marginTop: '0.75rem' }}>⏳ Файл уншиж байна...</p>}
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: '8px', padding: '0.45rem 0.875rem', fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📄 <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{file?.name}</span>
              <span style={{ color: '#475569' }}>· {sheets.length} sheet</span>
            </div>
            <button onClick={reset} style={{ padding: '0.45rem 0.875rem', background: 'transparent', border: '1px solid #2d3148', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem' }}>✕ Цуцлах</button>
          </div>

          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {sheets.map(s => (
              <button key={s.name} onClick={() => setSelectedSheet(s.name)}
                style={{ padding: '0.35rem 0.875rem', borderRadius: '8px', border: '1px solid', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', background: selectedSheet === s.name ? '#1e2d4a' : 'transparent', color: selectedSheet === s.name ? '#818cf8' : '#64748b', borderColor: selectedSheet === s.name ? '#2d3d6a' : '#2d3148' }}>
                {s.name} <span style={{ opacity: 0.6 }}>({s.rowCount})</span>
              </button>
            ))}
          </div>

          {selectedSheetData && (
            <div style={{ background: '#13151f', borderRadius: '10px', border: '1px solid #1e2132', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem 0.875rem', borderBottom: '1px solid #1e2132', fontSize: '0.68rem', color: '#475569' }}>Дээж — эхний 4 мөр</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                  <tbody>
                    {selectedSheetData.preview.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid #1a1d2e', background: ri === 0 ? '#0f1117' : 'transparent' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '0.45rem 0.875rem', color: ri === 0 ? '#818cf8' : '#94a3b8', fontWeight: ri === 0 ? 600 : 400, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

          <button onClick={handleImport} disabled={loading}
            style={{ padding: '0.6rem 1.5rem', background: loading ? '#2d3148' : `linear-gradient(135deg,${cfg.color},${cfg.color}bb)`, color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            {loading ? '⏳ Импорт хийж байна...' : `↑ ${cfg.label} импортлох`}
          </button>
        </div>
      )}

      {/* Result */}
      {step === 'done' && result && (
        <div style={{ background: '#13151f', borderRadius: '12px', border: '1px solid #1e2132', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#0f2318', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✅</div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9' }}>Импорт амжилттай</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>{cfg.label}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Stat label="Шинэ" value={result.created ?? result.imported ?? 0} color="#4ade80" bg="#0f2318" />
            <Stat label="Шинэчлэгдсэн" value={result.updated ?? 0} color="#818cf8" bg="#1e2340" />
            <Stat label="Алгасагдсан" value={result.skipped} color="#fbbf24" bg="#2d1f0a" />
          </div>

          {result.errors && result.errors.length > 0 && (
            <div style={{ background: '#2d1515', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, marginBottom: '0.35rem' }}>Алдааны мэдээлэл:</div>
              {result.errors.map((e, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#ef4444', marginBottom: '2px' }}>{e}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={reset} style={{ padding: '0.5rem 1rem', background: `linear-gradient(135deg,#6366f1,#8b5cf6)`, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>↑ Дахин импортлох</button>
            <a href={type === 'machines' ? '/fleet' : type === 'breakdowns' ? '/breakdowns' : type === 'parts' ? '/inventory' : '/pm'}
              style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#64748b', border: '1px solid #2d3148', borderRadius: '8px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Үр дүнг харах →
            </a>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '0.875rem 1rem', marginTop: '1rem', fontSize: '0.8rem', color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}

      {/* Data format reference */}
      <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#0a0c13', borderRadius: '12px', border: '1px solid #1a1d2e' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 1rem' }}>Бүх өгөгдлийн форматын лавлах</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
          <FormatCard
            icon="🚛" title="Техник" color="#6366f1"
            rows={[
              ['Парк дугаар *', 'HT-2001', 'Давтагдашгүй байх ёстой'],
              ['Загвар', 'WT-130', 'Хоосон бол WT-130 авна'],
              ['Мотор цаг (SMR)', '2036', 'Тоо'],
              ['Байршил', 'Шарын гол уурхай', 'Санамж функцэд хэрэглэнэ'],
              ['Өдрийн дундаж', '14.9', 'Цаг/өдөр'],
            ]}
          />
          <FormatCard
            icon="⚠" title="Эвдрэл" color="#f87171"
            rows={[
              ['Парк дугаар *', 'HT-2001', 'Системд байх техник'],
              ['Ангилал *', 'Хүч дамжуулах', 'Чөлөөт текст'],
              ['Тайлбар', 'Болт тасарсан', ''],
              ['Огноо *', '2025-01-15', 'YYYY-MM-DD эсвэл Excel огноо'],
              ['Зогссон цаг', '4.5', 'Цаг (тоо)'],
            ]}
          />
          <FormatCard
            icon="🔧" title="PM бүртгэл" color="#4ade80"
            rows={[
              ['Парк дугаар *', 'HT-2001', ''],
              ['PM төрөл *', '250', '250 / 500 / 1000 / 2000'],
              ['SMR *', '2000', 'PM хийгдсэн мотор цаг'],
              ['Огноо *', '2025-03-15', 'YYYY-MM-DD'],
              ['Механик', 'Б.Болд', 'Нэр (заавал биш)'],
            ]}
          />
          <FormatCard
            icon="▤" title="Сэлбэг" color="#fbbf24"
            rows={[
              ['Нэр *', 'Масло шүүр', ''],
              ['Ангилал *', 'OIL_FILTER', 'Доорх жагсаалтаас'],
              ['Нэгж *', 'ш', 'ш / л / кг / м'],
              ['Нөөц тоо', '12', '0 аас их тоо'],
              ['Агуулах', 'Агуулах 1', 'Системд байх агуулахын нэр'],
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: '10px', padding: '0.875rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>{label}</div>
    </div>
  )
}

function FormatCard({ icon, title, color, rows }: { icon: string; title: string; color: string; rows: [string, string, string][] }) {
  return (
    <div style={{ background: '#13151f', borderRadius: '10px', border: '1px solid #1e2132', overflow: 'hidden' }}>
      <div style={{ padding: '0.6rem 0.875rem', background: '#0f1117', borderBottom: '1px solid #1e2132', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>{icon}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([field, example, note], i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #12141e' : 'none' }}>
              <td style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: field.endsWith('*') ? color : '#64748b', fontWeight: field.endsWith('*') ? 600 : 400, whiteSpace: 'nowrap' }}>{field}</td>
              <td style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{example}</td>
              <td style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', color: '#334155' }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
