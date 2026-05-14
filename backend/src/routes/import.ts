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

export default router
