import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ── Тохиромжтой sheet-ийг автоматаар сонгох ──────────────────────────────────
function findInventorySheet(wb: XLSX.WorkBook): { ws: XLSX.WorkSheet; sheetName: string } {
  const sheetPrefKw  = ['үлдэгдэл', 'сэлбэг', 'дата', 'inventory', 'stock']
  const headerKw     = ['нэр', 'дугаар', 'тоо', 'ширхэг', 'үлдэгдэл', 'нэгж', 'name', 'code', 'qty']
  const excludeKw    = ['гүйлгээ', 'огноо', 'борлуулах', 'ашиг', 'нийт үнэ', 'transaction']

  function sheetScore(name: string, ws: XLSX.WorkSheet): number {
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const nameLow = name.toLowerCase()
    let score = sheetPrefKw.some(k => nameLow.includes(k)) ? 10 : 0

    for (const row of rows.slice(0, 10)) {
      const text = row.map((c: any) => String(c).toLowerCase()).join(' ')
      const hits = headerKw.filter(k => text.includes(k)).length
      const bad  = excludeKw.filter(k => text.includes(k)).length
      if (hits >= 3 && bad === 0) { score += hits * 2; break }
      if (hits >= 2 && bad === 0) { score += hits; break }
    }
    return score
  }

  let best = { score: -1, ws: wb.Sheets[wb.SheetNames[0]], sheetName: wb.SheetNames[0] }
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const s  = sheetScore(name, ws)
    if (s > best.score) best = { score: s, ws, sheetName: name }
  }
  return best
}

// ── Header мөр + баганы индексийг автоматаар олох ────────────────────────────
function detectColumns(rows: any[][]): {
  headerRow: number
  nameCol: number
  codeCol: number | null
  qtyCol:  number | null
  unitCol: number | null
} {
  const nameKw = ['нэр', 'name', 'барааны нэр', 'монгол нэр', 'эдийн нэр', 'бараа / нэр', 'бараа/нэр']
  const codeKw = ['дугаар', 'сериал', 'код', 'code', 'эдийн дугаар', 'сериал/дугаар']
  const qtyKw  = ['тоо', 'ширхэг', 'үлдэгдэл', 'qty', 'quantity', 'эхний үлдэгдэл', 'зарлага үлдэгдэл']
  const qtyEx  = ['нийт', 'total', 'нийт үнэ', 'борлуулах нийт']
  const unitKw = ['нэгж', 'хэмжээ', 'unit', 'хэмжих нэгж']

  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const headers = rows[r].map((c: any) => String(c ?? '').toLowerCase().trim())
    if (headers.every(h => h === '')) continue

    const nameCol = headers.findIndex(h => nameKw.some(k => h.includes(k)))
    const codeCol = headers.findIndex(h => codeKw.some(k => h.includes(k)))
    const qtyCol  = headers.findIndex(h =>
      qtyKw.some(k => h.includes(k)) && !qtyEx.some(e => h.includes(e))
    )
    const unitCol = headers.findIndex(h => unitKw.some(k => h.includes(k)))

    if (nameCol >= 0 && qtyCol >= 0) {
      return { headerRow: r, nameCol, codeCol: codeCol >= 0 ? codeCol : null, qtyCol, unitCol: unitCol >= 0 ? unitCol : null }
    }
  }

  // Fallback: нэр=0, тоо=1
  return { headerRow: 0, nameCol: 0, codeCol: null, qtyCol: 1, unitCol: null }
}

// ── Монгол нэрнээс ангилал тодорхойлох ──────────────────────────────────────
function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (/масло\s*шүүр|маслын\s*шүүр|oil\s*filter|маслыний\s*шүүр/.test(n)) return 'OIL_FILTER'
  if (/түлшн.{0,4}шүүр|fuel\s*filter|тунгаа.{0,6}шүүр/.test(n)) return 'FUEL_FILTER'
  if (/агаар\s*шүүгч|air\s*filter/.test(n)) return 'AIR_FILTER'
  if (/(хидравл|гидр).{0,6}шүүр/.test(n)) return 'HYDRAULIC_FILTER'
  if (/(хроп|трансмисс).{0,6}шүүр/.test(n)) return 'TRANSMISSION_FILTER'
  if (/хөдөлгүүрийн\s*тос|engine\s*oil|машины\s*тос/.test(n)) return 'ENGINE_OIL'
  if (/(хроп|трансмисс).{0,6}тос/.test(n)) return 'TRANSMISSION_FLUID'
  if (/(гидр|хидравл).{0,6}тос/.test(n)) return 'HYDRAULIC_FLUID'
  if (/хөргөгч|антифриз|coolant/.test(n)) return 'COOLANT'
  if (/ремен|belt/.test(n)) return 'BELT'
  if (/стартер|динам|реле|кабел|электр|electric/.test(n)) return 'ELECTRICAL'
  if (/дугуй|tire|wheel/.test(n)) return 'TIRE_PARTS'
  if (/кардан|хроп|муфь|drivetrain/.test(n)) return 'DRIVETRAIN'
  if (/тормос|brake/.test(n)) return 'BRAKE'
  return 'OTHER'
}

// ── Utility ──────────────────────────────────────────────────────────────────
function cleanStr(v: any): string  { return String(v ?? '').trim() }
function toQty(v: any): number     { const n = parseFloat(cleanStr(v).replace(/,/g, '')); return isNaN(n) ? -1 : n }

// ── CRUD routes ───────────────────────────────────────────────────────────────
router.get('/', auth, async (_, res) => {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { parts: true } } },
  })
  res.json(warehouses)
})

router.post('/', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { name, location } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Нэр оруулна уу' })
  const warehouse = await prisma.warehouse.create({ data: { name: name.trim(), location: location?.trim() || null } })
  res.json(warehouse)
})

router.patch('/:id', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { name, location } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Нэр оруулна уу' })
  const warehouse = await prisma.warehouse.update({
    where: { id: req.params.id },
    data: { name: name.trim(), location: location?.trim() ?? null },
  })
  res.json(warehouse)
})

router.delete('/:id', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const count = await prisma.part.count({ where: { warehouseId: req.params.id } })
  if (count > 0) return res.status(400).json({ error: `Энэ агуулахад ${count} сэлбэг байна. Эхлээд сэлбэгийг шилжүүлнэ үү.` })
  await prisma.warehouse.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── POST /api/warehouses/:id/import ──────────────────────────────────────────
router.post('/:id/import', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл оруулна уу' })

  const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })

  // 1. Тохиромжтой sheet сонгох
  const { ws, sheetName } = findInventorySheet(wb)
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })

  // 2. Header мөр + баганы индекс
  const { headerRow, nameCol, codeCol, qtyCol, unitCol } = detectColumns(rows)

  if (qtyCol === null) {
    return res.status(400).json({
      error: `Тоо хэмжээний багана олдсонгүй (sheet: "${sheetName}"). Толгой мөрт "тоо", "ширхэг", "үлдэгдэл" гэсэн үг байх ёстой.`
    })
  }

  // 3. Мэдээллийн мөрүүд — max 400
  const dataRows = rows
    .slice(headerRow + 1)
    .filter(row => {
      const name = cleanStr(row[nameCol])
      const qty  = toQty(row[qtyCol!])
      return name.length > 1 && qty >= 0
    })
    .slice(0, 400)

  // 4. Системийн бүх сэлбэг
  const parts = await prisma.part.findMany()

  const updated: { name: string; qty: number }[] = []
  const created: { name: string; qty: number }[] = []

  for (const row of dataRows) {
    const name = cleanStr(row[nameCol])
    const code = codeCol !== null ? cleanStr(row[codeCol]) : ''
    const qty  = toQty(row[qtyCol!])
    const unit = unitCol !== null ? cleanStr(row[unitCol]) || 'ш' : 'ш'

    if (!name || qty < 0) continue

    const existing = parts.find(p =>
      (code && p.code && p.code === code) ||
      p.name.toLowerCase() === name.toLowerCase() ||
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(p.name.toLowerCase())
    )

    if (existing) {
      await prisma.part.update({
        where: { id: existing.id },
        data: { stockQty: qty, warehouseId: req.params.id },
      })
      updated.push({ name: existing.name, qty })
    } else {
      const category = detectCategory(name)
      const newPart = await prisma.part.create({
        data: {
          name,
          code: code || null,
          category: category as any,
          unit,
          stockQty: qty,
          minStockQty: 0,
          warehouseId: req.params.id,
        },
      })
      parts.push(newPart)
      created.push({ name, qty })
    }
  }

  res.json({ updated, created, notFound: [], total: dataRows.length, sheetName })
})

export default router
