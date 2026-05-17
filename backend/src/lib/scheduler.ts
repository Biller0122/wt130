import { prisma } from './prisma'
import { generatePredictions } from '../services/aiService'

const INTERVAL_MS = 60 * 60 * 1000 // цаг бүр шалгана

async function runDailyAnalysis() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const machines = await prisma.machine.findMany({
    where: { status: { in: ['ACTIVE', 'IN_REPAIR'] } },
    select: { id: true, parkNumber: true },
  })

  const stale: typeof machines = []

  for (const m of machines) {
    const latest = await prisma.prediction.findFirst({
      where: { machineId: m.id },
      orderBy: { generatedAt: 'desc' },
      select: { generatedAt: true },
    })
    if (!latest || latest.generatedAt < todayStart) {
      stale.push(m)
    }
  }

  if (stale.length === 0) return

  console.log(`[Scheduler] ${stale.length} техникт өдрийн шинжилгээ хийнэ...`)

  for (const m of stale) {
    try {
      await generatePredictions(m.id)
      console.log(`[Scheduler] ✓ ${m.parkNumber} шинжилгээ дууслаа`)
    } catch (e: any) {
      console.error(`[Scheduler] ✗ ${m.parkNumber}: ${e.message}`)
    }
    // vLLM дарагдахгүйн тулд машин хооронд 3 секунд хүлээнэ
    await new Promise(r => setTimeout(r, 3000))
  }

  console.log(`[Scheduler] Өдрийн шинжилгээ дууслаа`)
}

export function startScheduler() {
  // Сервер асаахад нэн даруй нэг удаа ажиллуулна
  setTimeout(runDailyAnalysis, 5000)

  // Цаг бүр шалгаад шаардлагатай бол дахин ажиллуулна
  setInterval(runDailyAnalysis, INTERVAL_MS)

  console.log('[Scheduler] Өдрийн таамаглал scheduler идэвхжлээ')
}
