import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', auth, async (req: AuthRequest, res) => {
  const isClient = req.user!.role === 'CLIENT'
  const mw = isClient ? { clientId: req.user!.clientId! } : {}
  const [machineCount, activeCount, openBreakdowns, parts, recentPMs, recentBreakdowns] = await Promise.all([
    prisma.machine.count({ where: mw }),
    prisma.machine.count({ where: { ...mw, status: 'ACTIVE' } }),
    prisma.breakdown.count({ where: { status: 'OPEN', ...(isClient ? { machine: { clientId: req.user!.clientId! } } : {}) } }),
    isClient ? Promise.resolve([]) : prisma.part.findMany(),
    prisma.pMRecord.findMany({ where: isClient ? { machine: mw } : {}, orderBy: { doneAt: 'desc' }, take: 5, include: { machine: { select: { parkNumber: true } } } }),
    prisma.breakdown.findMany({ where: { status: { in: ['OPEN','IN_PROGRESS'] }, ...(isClient ? { machine: mw } : {}) }, orderBy: { reportedAt: 'desc' }, take: 5, include: { machine: { select: { parkNumber: true } } } }),
  ])
  const lowStockCount = parts.filter(p => p.stockQty <= p.minStockQty).length
  res.json({ machineCount, activeCount, openBreakdowns, lowStockCount, recentPMs, recentBreakdowns })
})

export default router
