import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest, requireRole } from '../middleware/auth'
import { computeFleetStatus } from '../services/pmService'

const router = Router()

// GET /api/machines — list with PM status
router.get('/', auth, async (req: AuthRequest, res) => {
  const where = req.user!.role === 'CLIENT' ? { clientId: req.user!.clientId! } : {}
  const machines = await prisma.machine.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { parkNumber: 'asc' },
  })
  const withStatus = machines.map(m => ({
    ...m,
    ...computeFleetStatus(m.currentSmr, m.dailyAvgSmr),
  }))
  res.json(withStatus)
})

// GET /api/machines/:id
router.get('/:id', auth, async (req, res) => {
  const machine = await prisma.machine.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      pmRecords: { orderBy: { doneAt: 'desc' }, take: 10 },
      breakdowns: { orderBy: { reportedAt: 'desc' }, take: 10 },
      predictions: { where: { dismissed: false }, orderBy: { generatedAt: 'desc' } },
    },
  })
  if (!machine) return res.status(404).json({ error: 'Олдсонгүй' })
  res.json({ ...machine, ...computeFleetStatus(machine.currentSmr, machine.dailyAvgSmr) })
})

// PATCH /api/machines/:id/smr — update SMR reading
router.patch('/:id/smr', auth, requireRole('ADMIN', 'MECHANIC', 'MANAGER'), async (req, res) => {
  const { smr } = req.body
  if (!smr || isNaN(smr)) return res.status(400).json({ error: 'SMR утга буруу' })
  const machine = await prisma.machine.update({
    where: { id: req.params.id },
    data: { currentSmr: parseFloat(smr), lastSmrDate: new Date() },
  })
  res.json(machine)
})

// GET /api/machines/:id/history — breakdown + PM timeline
router.get('/:id/history', auth, async (req, res) => {
  const [pms, breakdowns] = await Promise.all([
    prisma.pMRecord.findMany({
      where: { machineId: req.params.id },
      orderBy: { doneAt: 'desc' },
      take: 30,
    }),
    prisma.breakdown.findMany({
      where: { machineId: req.params.id },
      orderBy: { reportedAt: 'desc' },
      take: 30,
    }),
  ])
  res.json({ pms, breakdowns })
})

export default router
