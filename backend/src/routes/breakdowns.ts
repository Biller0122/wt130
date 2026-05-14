import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', auth, async (req: AuthRequest, res) => {
  const { machineId, status, category } = req.query
  const where: any = {}
  if (machineId) where.machineId = machineId as string
  if (status) where.status = status as string
  if (category) where.category = category as string
  if (req.user!.role === 'CLIENT') {
    where.machine = { clientId: req.user!.clientId }
  }
  const items = await prisma.breakdown.findMany({
    where,
    include: { machine: { select: { parkNumber: true, model: true } } },
    orderBy: { reportedAt: 'desc' },
    take: 100,
  })
  res.json(items)
})

router.post('/', auth, requireRole('ADMIN', 'MECHANIC', 'MANAGER'), async (req, res) => {
  const { machineId, category, description, smrAtBreak, mechanic } = req.body
  const record = await prisma.breakdown.create({
    data: { machineId, category, description, smrAtBreak: smrAtBreak ? parseFloat(smrAtBreak) : undefined, mechanic, reportedAt: new Date() },
  })
  res.json(record)
})

router.patch('/:id', auth, requireRole('ADMIN', 'MECHANIC', 'MANAGER'), async (req, res) => {
  const { status, workReport, resolvedAt, downtimeHrs, mechanic } = req.body
  const record = await prisma.breakdown.update({
    where: { id: req.params.id },
    data: { status, workReport, mechanic, resolvedAt: resolvedAt ? new Date(resolvedAt) : undefined, downtimeHrs: downtimeHrs ? parseFloat(downtimeHrs) : undefined },
  })
  res.json(record)
})

router.get('/stats', auth, async (_, res) => {
  const byCategory = await prisma.breakdown.groupBy({
    by: ['category'],
    _count: true,
    _sum: { downtimeHrs: true },
    orderBy: { _sum: { downtimeHrs: 'desc' } },
  })

  const monthly = await prisma.breakdown.findMany({
    select: { reportedAt: true, downtimeHrs: true },
    orderBy: { reportedAt: 'desc' },
    take: 200,
  })

  // Сараар бүлэглэх
  const monthMap: Record<string, { count: number; totalHrs: number }> = {}
  monthly.forEach(b => {
    const key = b.reportedAt.toISOString().slice(0, 7)
    if (!monthMap[key]) monthMap[key] = { count: 0, totalHrs: 0 }
    monthMap[key].count++
    monthMap[key].totalHrs += b.downtimeHrs ?? 0
  })

  const monthlyArr = Object.entries(monthMap)
    .map(([month, v]) => ({ month, count: v.count, total_hrs: Math.round(v.totalHrs * 10) / 10 }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12)

  res.json({ byCategory, monthly: monthlyArr })
})

export default router
