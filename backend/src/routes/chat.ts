import { Router } from 'express'
import { auth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b'

const router = Router()

router.post('/', auth, async (req, res) => {
  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'Мессэж хоосон байна' })

  const [machines, openBreakdowns, lowStock] = await Promise.all([
    prisma.machine.findMany({ select: { parkNumber: true, currentSmr: true, status: true, dailyAvgSmr: true }, take: 20 }),
    prisma.breakdown.count({ where: { status: 'OPEN' } }),
    prisma.part.findMany().then(parts => parts.filter(p => p.stockQty <= p.minStockQty)),
  ])

  const fleetSummary = `Флотын байдал: Нийт ${machines.length} техник (${machines.filter(m => m.status === 'ACTIVE').length} ажиллаж байна), нээлттэй эвдрэл: ${openBreakdowns}, дутагдалтай сэлбэг: ${lowStock.length}`

  const system = `Та бол LOVOL WT-130 уурхайн техникийн засварын мэргэжилтэн туслах юм.
Зөвхөн монгол хэлээр хариулна уу. Богино, тодорхой хариулт өг.
Техникийн асуудалд мэргэжлийн зөвлөгөө өг.
${fleetSummary}`

  const messages = [
    ...history.slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ]

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: system },
          ...messages
        ],
      }),
    })

    if (!ollamaRes.ok) throw new Error(`Ollama: ${ollamaRes.status}`)
    const data = await ollamaRes.json()
    res.json({ reply: data.message?.content ?? 'Хариу байхгүй' })
  } catch (e: any) {
    res.status(500).json({ error: `Ollama холбогдохгүй байна: ${e.message}` })
  }
})

export default router
