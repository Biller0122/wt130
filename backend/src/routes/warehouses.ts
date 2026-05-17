import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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

// POST /api/warehouses/:id/import — Excel-ээр үлдэгдэл шинэчлэх
router.post('/:id/import', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл оруулна уу' })

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })

  // Толгой мөрийг алгасах — эхний нүд нь тоо биш бол
  const dataRows = rows.filter(r => r[0] != null && r[1] != null)
  const skipFirst = dataRows.length > 0 && isNaN(parseFloat(String(dataRows[0][1])))
  const effectiveRows = skipFirst ? dataRows.slice(1) : dataRows

  const parts = await prisma.part.findMany({ where: { warehouseId: req.params.id } })

  const updated: string[] = []
  const notFound: string[] = []

  for (const row of effectiveRows) {
    const identifier = String(row[0]).trim()
    const qty = parseFloat(String(row[1]))
    if (!identifier || isNaN(qty)) continue

    const part = parts.find(p =>
      (p.code && p.code.toLowerCase() === identifier.toLowerCase()) ||
      p.name.toLowerCase().includes(identifier.toLowerCase()) ||
      identifier.toLowerCase().includes(p.name.toLowerCase())
    )

    if (part) {
      await prisma.part.update({ where: { id: part.id }, data: { stockQty: qty } })
      updated.push(part.name)
    } else {
      notFound.push(identifier)
    }
  }

  res.json({ updated, notFound, total: effectiveRows.length })
})

export default router
