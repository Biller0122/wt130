import { Router } from 'express'
import { auth, requireRole } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import * as XLSX from 'xlsx'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Excel-ийн мөрүүдийг цэвэрлэх
function clean(val: any): string { return val == null ? '' : String(val).trim() }
function toNum(val: any): number { const n = parseFloat(String(val).replace(/,/g, '')); return isNaN(n) ? 0 : n }
function toDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  // Excel serial date
  if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000)
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

// Sheet-ийн header мөрийг олох
function findHeaderRow(ws: XLSX.WorkSheet, keywords: string[]): number {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && keywords.some(k => clean(cell.v).toLowerCase().includes(k.toLowerCase()))) {
        return r
      }
    }
  }
  return 0
}

// ── POST /api/import/preview ── файл уншиж sheet жагсаалт + дээж буцаана
router.post('/preview', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй' })
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const sheets = wb.SheetNames.map(name => {
      const ws = wb.Sheets[name]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
      return {
        name,
        rowCount: rows.length,
        preview: rows.slice(0, 4).map(r => r.slice(0, 8).map(c => clean(c))),
      }
    })
    res.json({ sheets, filename: req.file.originalname })
  } catch (e: any) {
    res.status(400).json({ error: `Файл уншихад алдаа: ${e.message}` })
  }
})

// ── POST /api/import/machines ── техникийн жагсаалт
router.post('/machines', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй' })
  const { sheetName } = req.body
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[sheetName ?? wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

    // Header мөр олох
    const hRow = findHeaderRow(ws, ['парк', 'park', 'дугаар', 'модель', 'model'])
    const headers = rows[hRow].map(h => clean(h).toLowerCase())

    const parkIdx = headers.findIndex(h => h.includes('парк') || h.includes('park'))
    const modelIdx = headers.findIndex(h => h.includes('модель') || h.includes('model') || h.includes('загвар'))
    const smrIdx = headers.findIndex(h => h.includes('smr') || h.includes('мот') || h.includes('цаг') || h.includes('hour'))
    const locIdx = headers.findIndex(h => h.includes('байршил') || h.includes('location'))
    const statusIdx = headers.findIndex(h => h.includes('төлөв') || h.includes('status'))

    if (parkIdx === -1) return res.status(400).json({ error: 'Парк дугаарын багана олдсонгүй. Баганын нэрийг шалгана уу.' })

    let created = 0, updated = 0, skipped = 0
    const errors: string[] = []

    for (let i = hRow + 1; i < rows.length; i++) {
      const row = rows[i]
      const park = clean(row[parkIdx])
      if (!park) continue

      const smr = smrIdx >= 0 ? toNum(row[smrIdx]) : 0
      const model = modelIdx >= 0 ? clean(row[modelIdx]) || 'WT-130' : 'WT-130'
      const location = locIdx >= 0 ? clean(row[locIdx]) : ''

      try {
        const existing = await prisma.machine.findUnique({ where: { parkNumber: park } })
        if (existing) {
          await prisma.machine.update({
            where: { parkNumber: park },
            data: { currentSmr: smr || existing.currentSmr, model: model || existing.model, location: location || existing.location, lastSmrDate: new Date() }
          })
          updated++
        } else {
          await prisma.machine.create({
            data: { parkNumber: park, model, location, currentSmr: smr, manufacturer: 'LOVOL', status: 'ACTIVE', dailyAvgSmr: 14 }
          })
          created++
        }
      } catch (e: any) {
        errors.push(`Мөр ${i + 1} (${park}): ${e.message}`)
        skipped++
      }
    }

    res.json({ success: true, created, updated, skipped, errors: errors.slice(0, 5) })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// ── POST /api/import/breakdowns ── эвдрэлийн түүх
router.post('/breakdowns', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй' })
  const { sheetName } = req.body
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[sheetName ?? wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    const hRow = findHeaderRow(ws, ['парк', 'загвар', 'эвдрэл', 'breakdown', 'ангилал'])
    const headers = rows[hRow].map(h => clean(h).toLowerCase())

    const parkIdx = headers.findIndex(h => h.includes('парк') || h.includes('park'))
    const catIdx = headers.findIndex(h => h.includes('ангилал') || h.includes('category') || h.includes('эвдрэл'))
    const descIdx = headers.findIndex(h => h.includes('тайлбар') || h.includes('дуудлага') || h.includes('мэдээлэл') || h.includes('description'))
    const dateIdx = headers.findIndex(h => h.includes('огноо') || h.includes('date') || h.includes('зогссон'))
    const smrIdx = headers.findIndex(h => h.includes('smr') || h.includes('мото') || h.includes('цаг') || h.includes('hour'))
    const downtimeIdx = headers.findIndex(h => h.includes('зогссон цаг') || h.includes('downtime'))

    if (parkIdx === -1) return res.status(400).json({ error: 'Парк дугаарын багана олдсонгүй' })

    let imported = 0, skipped = 0
    const errors: string[] = []

    // Машинуудын кэш
    const machineCache = new Map<string, string>()
    const allMachines = await prisma.machine.findMany({ select: { id: true, parkNumber: true } })
    allMachines.forEach(m => machineCache.set(m.parkNumber.toLowerCase(), m.id))

    for (let i = hRow + 1; i < rows.length; i++) {
      const row = rows[i]
      const parkRaw = clean(row[parkIdx])
      if (!parkRaw) continue

      // Парк дугаар олох — хэсэгчилсэн тохирлоор
      let machineId = machineCache.get(parkRaw.toLowerCase())
      if (!machineId) {
        for (const [key, id] of machineCache) {
          if (key.includes(parkRaw.toLowerCase()) || parkRaw.toLowerCase().includes(key)) {
            machineId = id; break
          }
        }
      }

      if (!machineId) { skipped++; continue }

      const category = catIdx >= 0 ? clean(row[catIdx]) || 'Бусад' : 'Бусад'
      const description = descIdx >= 0 ? clean(row[descIdx]) : 'Импортоор орсон эвдрэл'
      const reportedAt = dateIdx >= 0 ? toDate(row[dateIdx]) ?? new Date() : new Date()
      const smr = smrIdx >= 0 ? toNum(row[smrIdx]) : undefined
      const downtime = downtimeIdx >= 0 ? toNum(row[downtimeIdx]) : undefined

      try {
        await prisma.breakdown.create({
          data: { machineId, category, description: description || 'Тайлбар байхгүй', reportedAt, smrAtBreak: smr, downtimeHrs: downtime, status: 'RESOLVED' }
        })
        imported++
      } catch (e: any) {
        errors.push(`Мөр ${i + 1}: ${e.message}`)
        skipped++
      }
    }

    res.json({ success: true, imported, skipped, errors: errors.slice(0, 5) })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// ── POST /api/import/pm ── PM бүртгэл
router.post('/pm', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй' })
  const { sheetName } = req.body
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[sheetName ?? wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    const hRow = findHeaderRow(ws, ['парк', 'pm', 'үйлчилгээ', 'мот', 'огноо'])
    const headers = rows[hRow].map(h => clean(h).toLowerCase())

    const parkIdx = headers.findIndex(h => h.includes('парк') || h.includes('park'))
    const pmTypeIdx = headers.findIndex(h => h.includes('pm төрөл') || h.includes('pm type') || h.includes('pm_type') || (h.includes('pm') && h.includes('төрөл')))
    const smrIdx = headers.findIndex(h => h.includes('мот цаг') || h.includes('smr') || h.includes('hourmeter'))
    const dateIdx = headers.findIndex(h => h.includes('огноо') || h.includes('date') || h.includes('хийгдсэн'))
    const mechIdx = headers.findIndex(h => h.includes('механик') || h.includes('mechanic') || h.includes('ажилтан'))

    if (parkIdx === -1) return res.status(400).json({ error: 'Парк дугаарын багана олдсонгүй' })

    let imported = 0, skipped = 0
    const machineCache = new Map<string, string>()
    const allMachines = await prisma.machine.findMany({ select: { id: true, parkNumber: true } })
    allMachines.forEach(m => machineCache.set(m.parkNumber.toLowerCase(), m.id))

    for (let i = hRow + 1; i < rows.length; i++) {
      const row = rows[i]
      const parkRaw = clean(row[parkIdx])
      if (!parkRaw) continue

      let machineId = machineCache.get(parkRaw.toLowerCase())
      if (!machineId) {
        for (const [key, id] of machineCache) {
          if (key.includes(parkRaw.toLowerCase()) || parkRaw.toLowerCase().includes(key)) { machineId = id; break }
        }
      }
      if (!machineId) { skipped++; continue }

      const pmType = pmTypeIdx >= 0 ? toNum(row[pmTypeIdx]) : 250
      const smr = smrIdx >= 0 ? toNum(row[smrIdx]) : 0
      const doneAt = dateIdx >= 0 ? toDate(row[dateIdx]) ?? new Date() : new Date()
      const mechanic = mechIdx >= 0 ? clean(row[mechIdx]) : ''

      if (!pmType || !smr) { skipped++; continue }

      try {
        await prisma.pMRecord.create({
          data: { machineId, pmType, smrAtPM: smr, doneAt, mechanic: mechanic || null, nextPMSmr: smr + 250 }
        })
        imported++
      } catch { skipped++ }
    }

    res.json({ success: true, imported, skipped })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// ── GET /api/import/template/:type ── Excel загвар татах
router.get('/template/:type', auth, (req, res) => {
  const type = req.params.type

  const templates: Record<string, { sheet: string; headers: string[]; examples: any[][] }> = {
    machines: {
      sheet: 'Техник',
      headers: ['Парк дугаар *', 'Загвар', 'Мотор цаг (SMR)', 'Байршил', 'Өдрийн дундаж SMR', 'Серийн дугаар', 'Үйлдвэрлэсэн он'],
      examples: [
        ['HT-2001', 'WT-130', 2036, 'Шарын гол уурхай', 14.9, 'SN20210001', 2021],
        ['HT-2002', 'WT-130', 1797, 'Эрдэнэт уурхай', 15.5, 'SN20210002', 2021],
        ['HT-2003', 'WT-130', 2426, 'Шарын гол уурхай', 14.3, 'SN20210003', 2020],
      ],
    },
    breakdowns: {
      sheet: 'Эвдрэлийн түүх',
      headers: ['Парк дугаар *', 'Ангилал *', 'Тайлбар', 'Огноо *', 'SMR', 'Зогссон цаг', 'Механик'],
      examples: [
        ['HT-2001', 'Хүч дамжуулах', 'Гожукны болт тасарсан', '2025-01-15', 1980, 4.5, 'Б.Болд'],
        ['HT-2001', 'Хөдөлгүүр', 'Агаар шүүгч бохирдол', '2025-02-20', 2010, 2.0, 'Д.Дорж'],
        ['HT-2002', 'Дугуй солих', '5-р дугуй хагарсан', '2025-03-10', 1760, 1.5, ''],
      ],
    },
    pm: {
      sheet: 'PM бүртгэл',
      headers: ['Парк дугаар *', 'PM төрөл * (250/500/1000/2000)', 'SMR *', 'Огноо *', 'Механик', 'Тэмдэглэл'],
      examples: [
        ['HT-2001', 250, 1750, '2025-01-10', 'Б.Болд', 'Ердийн PM'],
        ['HT-2001', 500, 2000, '2025-03-15', 'Б.Болд', '500 цагийн PM'],
        ['HT-2002', 250, 1500, '2025-02-01', 'Д.Дорж', ''],
      ],
    },
    parts: {
      sheet: 'Сэлбэг',
      headers: [
        'Код', 'Нэр *', 'Ангилал *', 'Нэгж *', 'Нөөц тоо', 'Доод нөөц', 'Нэгж үнэ (₮)', 'Агуулах', 'Нийлүүлэгч', 'Тэмдэглэл',
      ],
      examples: [
        ['OIL-F-001', 'Хөдөлгүүрийн масло шүүр', 'OIL_FILTER', 'ш', 12, 20, 15000, 'Агуулах 1', 'Lovol Parts MN', ''],
        ['FUEL-F-001', 'Түлшний шүүр (доод)', 'FUEL_FILTER', 'ш', 8, 15, 12000, 'Агуулах 1', '', ''],
        ['AIR-F-001', 'Агаар шүүгч (дотор)', 'AIR_FILTER', 'ш', 6, 10, 45000, 'Агуулах 2', '', ''],
        ['ENG-OIL-001', 'Хөдөлгүүрийн масло 10W40', 'ENGINE_OIL', 'л', 240, 500, 4500, 'Агуулах 1', '', ''],
      ],
    },
    inventory: {
      sheet: 'Үлдэгдэл шинэчлэл',
      headers: ['Код эсвэл нэр *', 'Тоо хэмжээ *'],
      examples: [
        ['OIL-F-001', 12],
        ['Хөдөлгүүрийн масло шүүр', 12],
        ['FUEL-F-001', 8],
        ['ENG-OIL-001', 240],
      ],
    },
  }

  const tmpl = templates[type]
  if (!tmpl) return res.status(404).json({ error: 'Загвар олдсонгүй' })

  const ws = XLSX.utils.aoa_to_sheet([tmpl.headers, ...tmpl.examples])

  // Толгой мөрийг тодруулах
  const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: '1E2340' } } }
  }

  // Багана өргөн
  ws['!cols'] = tmpl.headers.map(() => ({ wch: 22 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, tmpl.sheet)

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.xlsx"`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

// ── POST /api/import/parts ── сэлбэгийн каталог + нөөц
router.post('/parts', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй' })
  const { sheetName } = req.body
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[sheetName ?? wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    const hRow = findHeaderRow(ws, ['нэр', 'код', 'name', 'ангилал', 'category'])
    const headers = rows[hRow].map(h => clean(h).toLowerCase())

    const codeIdx  = headers.findIndex(h => h.includes('код') || h.includes('code'))
    const nameIdx  = headers.findIndex(h => h.includes('нэр') || h.includes('name'))
    const catIdx   = headers.findIndex(h => h.includes('ангилал') || h.includes('category'))
    const unitIdx  = headers.findIndex(h => h.includes('нэгж') || h.includes('unit'))
    const stockIdx = headers.findIndex(h => h.includes('нөөц тоо') || h.includes('нөөц') || h.includes('stock') || h.includes('qty'))
    const minIdx   = headers.findIndex(h => h.includes('доод') || h.includes('min'))
    const priceIdx = headers.findIndex(h => h.includes('үнэ') || h.includes('price'))
    const whIdx    = headers.findIndex(h => h.includes('агуулах') || h.includes('warehouse'))
    const suppIdx  = headers.findIndex(h => h.includes('нийлүүлэгч') || h.includes('supplier'))

    if (nameIdx === -1) return res.status(400).json({ error: 'Нэрийн багана олдсонгүй' })

    const VALID_CATS = ['OIL_FILTER','FUEL_FILTER','AIR_FILTER','TRANSMISSION_FILTER','HYDRAULIC_FILTER',
      'ENGINE_OIL','TRANSMISSION_FLUID','HYDRAULIC_FLUID','COOLANT','BELT','ELECTRICAL',
      'TIRE_PARTS','DRIVETRAIN','BRAKE','STRUCTURAL','OTHER']

    const warehouses = await prisma.warehouse.findMany()
    const whByName = new Map(warehouses.map(w => [w.name.toLowerCase().trim(), w.id]))

    let created = 0, updated = 0, skipped = 0
    const errors: string[] = []

    for (let i = hRow + 1; i < rows.length; i++) {
      const row = rows[i]
      const name = clean(row[nameIdx])
      if (!name) continue

      const code = codeIdx >= 0 ? clean(row[codeIdx]) || null : null
      const catRaw = catIdx >= 0 ? clean(row[catIdx]).toUpperCase().replace(/\s+/g, '_') : 'OTHER'
      const category = VALID_CATS.includes(catRaw) ? catRaw : 'OTHER'
      const unit = unitIdx >= 0 ? clean(row[unitIdx]) || 'ш' : 'ш'
      const stockQty = stockIdx >= 0 ? toNum(row[stockIdx]) : 0
      const minStockQty = minIdx >= 0 ? toNum(row[minIdx]) : 0
      const unitPrice = priceIdx >= 0 ? toNum(row[priceIdx]) || null : null
      const supplier = suppIdx >= 0 ? clean(row[suppIdx]) || null : null
      const whName = whIdx >= 0 ? clean(row[whIdx]).toLowerCase().trim() : ''
      const warehouseId = whName ? whByName.get(whName) ?? null : null

      try {
        if (code) {
          const existing = await prisma.part.findUnique({ where: { code } })
          if (existing) {
            await prisma.part.update({ where: { code }, data: { name, category: category as any, unit, stockQty, minStockQty, unitPrice, supplier, warehouseId } })
            updated++
          } else {
            await prisma.part.create({ data: { code, name, category: category as any, unit, stockQty, minStockQty, unitPrice, supplier, warehouseId } })
            created++
          }
        } else {
          const existing = await prisma.part.findFirst({ where: { name } })
          if (existing) {
            await prisma.part.update({ where: { id: existing.id }, data: { category: category as any, unit, stockQty, minStockQty, unitPrice, supplier, warehouseId } })
            updated++
          } else {
            await prisma.part.create({ data: { name, category: category as any, unit, stockQty, minStockQty, unitPrice, supplier, warehouseId } })
            created++
          }
        }
      } catch (e: any) {
        errors.push(`Мөр ${i + 1} (${name}): ${e.message}`)
        skipped++
      }
    }

    res.json({ success: true, created, updated, skipped, errors: errors.slice(0, 5) })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

export default router
