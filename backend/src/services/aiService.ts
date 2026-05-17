import { prisma } from '../lib/prisma'

const VLLM_URL = process.env.VLLM_URL || 'http://localhost:8000'
const VLLM_MODEL = process.env.VLLM_MODEL || 'google/gemma-4-4b-it'

export async function vllmChat(
  system: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(`${VLLM_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      model: VLLM_MODEL,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) throw new Error(`vLLM error: ${res.status} ${await res.text()}`)
  const data = await res.json() as any
  return data.choices?.[0]?.message?.content ?? ''
}

async function ollamaChat(system: string, user: string): Promise<string> {
  return vllmChat(system, [{ role: 'user', content: user }])
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
    const res = await fetch(`${VLLM_URL}/v1/models`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    const data = await res.json() as any
    const models: string[] = data.data?.map((m: any) => m.id) ?? []
    const hasModel = models.some((m) => m.includes('gemma'))
    return { running: true, model: hasModel ? VLLM_MODEL : `${VLLM_MODEL} (ачаалагдаагүй)`, url: VLLM_URL }
  } catch {
    return { running: false, model: VLLM_MODEL, url: VLLM_URL }
  }
}
