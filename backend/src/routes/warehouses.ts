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

// POST /api/warehouses/:id/import — AI-аар Excel задлаж сэлбэг үүсгэх/шинэчлэх
router.post('/:id/import', auth, requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл оруулна уу' })

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })

  // Token хэмнэх: 60 мөр, 6 багана, 25 тэмдэгт/нүд
  const nonEmpty = rows.filter((r: any[]) => r.some(c => c !== '' && c != null))
  const excelText = nonEmpty.slice(0, 60)
    .map((row: any[], i: number) =>
      `${i}:${row.slice(0, 6).map((c: any) => String(c).trim().slice(0, 25)).join('|')}`)
    .join('\n')

  const parts = await prisma.part.findMany()

  const VALID_CATS = ['OIL_FILTER','FUEL_FILTER','AIR_FILTER','TRANSMISSION_FILTER','HYDRAULIC_FILTER',
    'ENGINE_OIL','TRANSMISSION_FLUID','HYDRAULIC_FLUID','COOLANT','BELT',
    'ELECTRICAL','TIRE_PARTS','DRIVETRAIN','BRAKE','STRUCTURAL','OTHER']

  // Каталог байвал тохируулахын тулд нэрсийг өгнө (max 100)
  const catalogHint = parts.length > 0
    ? `Existing parts (code|name):\n${parts.slice(0, 100).map(p => `${p.code || ''}|${p.name.slice(0, 30)}`).join('\n')}\n\n`
    : ''

  const system = `You are an inventory data extractor. Analyze the Excel file content and extract all parts with their quantities.
Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
Format: [{"code":"...","name":"...","qty":number,"unit":"...","category":"..."}]
Rules:
- name: part name from Excel (required, non-empty)
- code: part code if present, else ""
- qty: numeric quantity (required, must be a number)
- unit: unit from Excel or default "ш"
- category: guess from name — one of: ${VALID_CATS.join(',')}
- If existing parts catalog is given, use the exact catalog name when matched
- Skip rows without a clear name or numeric quantity`

  const user = `${catalogHint}Excel content:\n${excelText}\n\nReturn JSON array of all parts with quantities.`

  type AiItem = { code: string; name: string; qty: number; unit?: string; category?: string }
  let aiItems: AiItem[] = []
  let aiError: string | undefined

  try {
    const text = await vllmChat(system, [{ role: 'user', content: user }], 800)
    const match = text.match(/\[[\s\S]*\]/)
    if (match) aiItems = JSON.parse(match[0])
  } catch (e: any) {
    aiError = e.message
  }

  const updated: { name: string; qty: number }[] = []
  const created: { name: string; qty: number }[] = []

  for (const item of aiItems) {
    if (!item.name?.trim() || typeof item.qty !== 'number' || isNaN(item.qty)) continue

    const existing = parts.find(p =>
      (item.code && p.code && p.code.toLowerCase() === item.code.toLowerCase()) ||
      p.name.toLowerCase() === item.name.toLowerCase() ||
      p.name.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(p.name.toLowerCase())
    )

    if (existing) {
      await prisma.part.update({ where: { id: existing.id }, data: { stockQty: item.qty, warehouseId: req.params.id } })
      updated.push({ name: existing.name, qty: item.qty })
    } else {
      const cat = VALID_CATS.includes(item.category ?? '') ? item.category! : 'OTHER'
      const newPart = await prisma.part.create({
        data: {
          name: item.name.trim(),
          code: item.code?.trim() || null,
          category: cat as any,
          unit: item.unit?.trim() || 'ш',
          stockQty: item.qty,
          minStockQty: 0,
          warehouseId: req.params.id,
        },
      })
      parts.push(newPart)
      created.push({ name: newPart.name, qty: item.qty })
    }
  }

  res.json({ updated, created, notFound: [], total: aiItems.length, aiError })
})

export default router
