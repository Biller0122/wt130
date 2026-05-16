import { prisma } from '../lib/prisma'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b'

async function ollamaChat(system: string, user: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`)
  const data = await res.json() as any
  return data.message?.content ?? ''
}

export async function generatePredictions(machineId: string) {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: {
      breakdowns: {
        where: { reportedAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        orderBy: { reportedAt: 'desc' },
        take: 20,
      },
      pmRecords: { orderBy: { doneAt: 'desc' }, take: 1 },
    },
  })
  if (!machine) throw new Error('Машин олдсонгүй')

  const system = `You are an expert mining equipment maintenance engineer specializing in LOVOL WT-130 wheel loaders.
Analyze the maintenance data and predict future failure risks.
Respond ONLY with a valid JSON array. No explanation, no markdown, no extra text.
Format: [{"type":"category","riskLevel":"high|medium|low","title":"Mongolian title","description":"Mongolian description 1-2 sentences","recommendation":"Mongolian recommendation"}]
Write titles, descriptions and recommendations in Mongolian language.`

  const user = `Machine: ${machine.parkNumber} (${machine.model})
Current SMR: ${machine.currentSmr} hours
Daily average: ${machine.dailyAvgSmr} hours/day
Last PM: ${machine.pmRecords[0] ? `PM${machine.pmRecords[0].pmType} at ${machine.pmRecords[0].smrAtPM} SMR` : 'No record'}
Recent breakdowns (${machine.breakdowns.length} total):
${machine.breakdowns.map(b => `- ${b.category}: ${b.description} (${b.downtimeHrs ?? 0}h)`).join('\n')}

Return JSON array of 3-5 failure risk predictions only.`

  const text = await ollamaChat(system, user)

  let predictions: any[] = []
  try {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) predictions = JSON.parse(match[0])
  } catch {
    predictions = [{
      type: 'general',
      riskLevel: 'medium',
      title: 'Ерөнхий үзлэг шаардлагатай',
      description: 'Өгөгдөлд суурилан дүгнэлт гаргах боломжгүй байна.',
      recommendation: 'Ойрын 7 хоногт бүрэн үзлэг хийлгэнэ үү.',
    }]
  }

  await prisma.prediction.deleteMany({ where: { machineId } })
  await prisma.prediction.createMany({
    data: predictions.map((p: any) => ({
      machineId,
      type: p.type || 'general',
      riskLevel: p.riskLevel || 'medium',
      title: p.title || '',
      description: p.description || '',
      recommendation: p.recommendation || '',
      validUntil: new Date(Date.now() + 30 * 86400000),
    })),
  })

  return predictions
}

export async function generateServiceProposal(clientId: string): Promise<string> {
  const machines = await prisma.machine.findMany({
    where: { clientId },
    include: {
      breakdowns: { orderBy: { reportedAt: 'desc' }, take: 5 },
      predictions: { where: { dismissed: false } },
    },
  })

  const summary = machines.map(m => ({
    park: m.parkNumber,
    smr: m.currentSmr,
    topRisk: m.predictions[0]?.title ?? 'Хэвийн',
    openBreakdowns: m.breakdowns.filter(b => b.status === 'OPEN').length,
  }))

  return await ollamaChat(
    'You are a professional maintenance service manager. Write a service proposal letter in Mongolian language. Be professional and concise. Write 3-4 paragraphs only.',
    `Fleet data: ${JSON.stringify(summary)}. Write a professional service proposal in Mongolian.`
  )
}

export async function checkOllamaStatus(): Promise<{ running: boolean; model: string; url: string }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    const data = await res.json() as any
    const models = data.models?.map((m: any) => m.name) ?? []
    const hasModel = models.some((m: string) => m.includes('gemma'))
    return { running: true, model: hasModel ? OLLAMA_MODEL : `${OLLAMA_MODEL} (татагдаагүй)`, url: OLLAMA_URL }
  } catch {
    return { running: false, model: OLLAMA_MODEL, url: OLLAMA_URL }
  }
}
