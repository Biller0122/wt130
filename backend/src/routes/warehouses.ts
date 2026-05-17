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

  // Системийн бүх сэлбэгийг авна
  const parts = await prisma.part.findMany()
  const hasCatalog = parts.length > 0

  // Excel агуулгыг текст хэлбэрт оруулах
  const excelText = limited.map((row: any[], i: number) =>
    `${i}: ${row.map((c: any) => String(c).trim()).join(' | ')}`
  ).join('\n')

  const VALID_CATS = ['OIL_FILTER','FUEL_FILTER','AIR_FILTER','TRANSMISSION_FILTER','HYDRAULIC_FILTER',
    'ENGINE_OIL','TRANSMISSION_FLUID','HYDRAULIC_FLUID','COOLANT','BELT',
    'ELECTRICAL','TIRE_PARTS','DRIVETRAIN','BRAKE','STRUCTURAL','OTHER']

  const systemPrompt = hasCatalog
    ? `Та агуулахын тооллогын Excel файлыг дүн шинжилгээ хийж, системийн сэлбэгүүдтэй тохируулах үүрэгтэй.
Зөвхөн JSON массив буцаа. Тайлбар, markdown, нэмэлт текст огт бичихгүй.
Формат: [{"code":"...","name":"...","qty":тоо,"unit":"...","category":"..."}]
- code: системийн сэлбэгийн код (байхгүй бол "")
- name: системийн сэлбэгийн яг нэрийг ашиглана
- qty: Excel-ийн тоо хэмжээ (тоо байна)
- unit: нэгж (ш/л/кг/м — Excel-ээс уншиж эс бол "ш")
- category: ${VALID_CATS.join('/')} — нэрнээс таамаглана
Зөвхөн Excel-д тоо хэмжээтэй мөрийг буцаана.`
    : `Та агуулахын тооллогын Excel файлыг дүн шинжилгээ хийж сэлбэгийн жагсаалт гаргах үүрэгтэй.
Зөвхөн JSON массив буцаа. Тайлбар, markdown, нэмэлт текст огт бичихгүй.
Формат: [{"code":"...","name":"...","qty":тоо,"unit":"...","category":"..."}]
- code: сэлбэгийн код (Excel-ээс, байхгүй бол "")
- name: сэлбэгийн нэр (заавал байна)
- qty: тоо хэмжээ (тоо байна)
- unit: нэгж (ш/л/кг/м — Excel-ээс уншиж эс бол "ш")
- category: ${VALID_CATS.join('/')} — нэрнээс таамаглана
Зөвхөн тоо хэмжээтэй, нэртэй мөрийг буцаана.`

  const userPrompt = hasCatalog
    ? `Системийн сэлбэгийн каталог (Код | Нэр | Нэгж):\n${parts.map(p => `${p.code || '—'} | ${p.name} | ${p.unit}`).join('\n')}\n\nExcel файлын агуулга:\n${excelText}\n\nExcel файл дахь тоо хэмжээг системийн сэлбэгүүдтэй тохируулж JSON буцаа.`
    : `Excel файлын агуулга:\n${excelText}\n\nЭнэ Excel-ийн бүх сэлбэгийг JSON массив болгон задлаж буцаа.`

  type AiItem = { code: string; name: string; qty: number; unit?: string; category?: string }
  let aiItems: AiItem[] = []
  let aiError: string | undefined

  try {
    const text = await vllmChat(systemPrompt, [{ role: 'user', content: userPrompt }])
    const match = text.match(/\[[\s\S]*\]/)
    if (match) aiItems = JSON.parse(match[0])
  } catch (e: any) {
    aiError = e.message
  }

  const updated: { name: string; qty: number }[] = []
  const created: { name: string; qty: number }[] = []
  const notFound: string[] = []

  for (const item of aiItems) {
    if (!item.name || typeof item.qty !== 'number' || isNaN(item.qty)) continue

    const part = parts.find(p =>
      (item.code && p.code && p.code.toLowerCase() === item.code.toLowerCase()) ||
      p.name.toLowerCase() === item.name.toLowerCase() ||
      p.name.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(p.name.toLowerCase())
    )

    if (part) {
      await prisma.part.update({ where: { id: part.id }, data: { stockQty: item.qty, warehouseId: req.params.id } })
      updated.push({ name: part.name, qty: item.qty })
    } else if (!hasCatalog || !parts.length) {
      // Каталог хоосон үед шинэ сэлбэг үүсгэнэ
      const cat = VALID_CATS.includes(item.category ?? '') ? item.category! : 'OTHER'
      const newPart = await prisma.part.create({
        data: {
          name: item.name,
          code: item.code || null,
          category: cat as any,
          unit: item.unit || 'ш',
          stockQty: item.qty,
          minStockQty: 0,
          warehouseId: req.params.id,
        },
      })
      parts.push(newPart)
      created.push({ name: item.name, qty: item.qty })
    } else {
      notFound.push(item.name)
    }
  }

  res.json({ updated, created, notFound, total: aiItems.length, aiError })
})

export default router
