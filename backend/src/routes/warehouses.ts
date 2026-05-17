import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'
import { vllmChat } from '../services/aiService'

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

// POST /api/warehouses/:id/import — AI-аар Excel дүн шинжилгээ хийж үлдэгдэл шинэчлэх
router.post('/:id/import', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл оруулна уу' })

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })

  const nonEmpty = rows.filter((r: any[]) => r.some(c => c !== '' && c != null))
  const limited = nonEmpty.slice(0, 150)

  const parts = await prisma.part.findMany({ where: { warehouseId: req.params.id } })
  if (parts.length === 0) return res.status(400).json({ error: 'Энэ агуулахад сэлбэг байхгүй байна' })

  // Excel агуулгыг текст хэлбэрт оруулах
  const excelText = limited.map((row: any[], i: number) =>
    `${i}: ${row.map((c: any) => String(c).trim()).join(' | ')}`
  ).join('\n')

  // Агуулахын сэлбэгийн жагсаалт
  const partsList = parts.map(p => `${p.code || '—'} | ${p.name} | ${p.unit}`).join('\n')

  const system = `Та агуулахын тооллогын Excel файлыг дүн шинжилгээ хийж, бүртгэлд байгаа сэлбэгүүдтэй тохируулах үүрэгтэй.
Зөвхөн JSON массив буцаа. Тайлбар, markdown, нэмэлт текст бичихгүй.
Формат: [{"code":"...","name":"...","qty":тоо}]
- code: системийн сэлбэгийн код (байхгүй бол "")
- name: системийн сэлбэгийн нэр ЯМАН АЧА байна гэсэн нэрийг ашиглана
- qty: Excel-ийн тоо хэмжээ (заавал тоо байна)
Зөвхөн Excel-д тоо хэмжээтэй, системд байгаа сэлбэгүүдийг буцаана.`

  const user = `Агуулахын сэлбэгийн жагсаалт (Код | Нэр | Нэгж):
${partsList}

Excel файлын агуулга:
${excelText}

Excel файл дахь тоо хэмжээг агуулахын сэлбэгүүдтэй тохируулж JSON буцаа.`

  let aiItems: { code: string; name: string; qty: number }[] = []
  let aiError: string | undefined

  try {
    const text = await vllmChat(system, [{ role: 'user', content: user }])
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) aiItems = JSON.parse(match[0])
  } catch (e: any) {
    aiError = e.message
  }

  const updated: { name: string; qty: number }[] = []
  const notFound: string[] = []

  for (const item of aiItems) {
    if (typeof item.qty !== 'number' || isNaN(item.qty)) continue
    const part = parts.find(p =>
      (item.code && p.code && p.code.toLowerCase() === item.code.toLowerCase()) ||
      p.name.toLowerCase() === item.name.toLowerCase() ||
      p.name.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(p.name.toLowerCase())
    )
    if (part) {
      await prisma.part.update({ where: { id: part.id }, data: { stockQty: item.qty } })
      updated.push({ name: part.name, qty: item.qty })
    } else {
      notFound.push(item.name)
    }
  }

  res.json({
    updated,
    notFound,
    total: aiItems.length,
    aiError,
  })
})

export default router
