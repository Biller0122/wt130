import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest, requireRole } from '../middleware/auth'
import { computeFleetStatus, generate2MonthOrderList } from '../services/pmService'

const router = Router()

// GET /api/pm/schedule — full fleet PM schedule
router.get('/schedule', auth, async (req: AuthRequest, res) => {
  const where = req.user!.role === 'CLIENT' ? { clientId: req.user!.clientId! } : {}
  const machines = await prisma.machine.findMany({ where, orderBy: { parkNumber: 'asc' } })
  const schedule = machines.map(m => ({
    id: m.id,
    parkNumber: m.parkNumber,
    model: m.model,
    location: m.location,
    ...computeFleetStatus(m.currentSmr, m.dailyAvgSmr),
  })).sort((a, b) => a.nextPMDays - b.nextPMDays)
  res.json(schedule)
})

// POST /api/pm/record — log a completed PM
router.post('/record', auth, requireRole('ADMIN', 'MECHANIC', 'MANAGER'), async (req: AuthRequest, res) => {
  const { machineId, pmType, smrAtPM, mechanic, notes, partsUsed } = req.body
  if (!machineId || !pmType || !smrAtPM) return res.status(400).json({ error: 'Талбар дутуу' })

  const record = await prisma.pMRecord.create({
    data: {
      machineId,
      pmType: parseInt(pmType),
      doneAt: new Date(),
      smrAtPM: parseFloat(smrAtPM),
      mechanic,
      notes,
      nextPMSmr: parseFloat(smrAtPM) + 250,
      partsUsed: partsUsed ? { create: partsUsed } : undefined,
    },
    include: { partsUsed: true },
  })

  // Update machine SMR
  await prisma.machine.update({
    where: { id: machineId },
    data: { currentSmr: parseFloat(smrAtPM), lastSmrDate: new Date() },
  })

  res.json(record)
})

// GET /api/pm/order-list — auto-generate 2-month parts order
router.get('/order-list', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const machines = await prisma.machine.findMany()
  const kits = await prisma.pMKit.findMany({
    where: { model: 'WT-130' },
    include: { items: { include: { part: true } } },
  })
  const parts = await prisma.part.findMany()
  const stockMap = new Map(parts.map(p => [p.id, p.stockQty]))

  const pmKitMap = new Map(
    kits.map(k => [
      k.pmType,
      k.items.map(i => ({
        partId: i.partId,
        partName: i.part.name,
        quantity: i.quantity,
        unit: i.unit,
        stockQty: i.part.stockQty,
        minStockQty: i.part.minStockQty,
      })),
    ])
  )

  // Count machines per PM type in 60-day window
  const pmCounts = new Map<number, number>()
  for (const m of machines) {
    const { upcomingPMs } = computeFleetStatus(m.currentSmr, m.dailyAvgSmr)
    for (const pm of upcomingPMs) {
      pmCounts.set(pm.interval, (pmCounts.get(pm.interval) || 0) + 1)
    }
  }

  const upcomingPMs = Array.from(pmCounts.entries()).map(([interval, machineCount]) => ({
    interval,
    machineCount,
  }))

  const orderList = generate2MonthOrderList(upcomingPMs, pmKitMap, stockMap)
  res.json({ orderList, summary: { totalItems: orderList.length, urgentItems: orderList.filter(i => i.urgent).length } })
})

// GET /api/pm/kits — PM kit definitions
router.get('/kits', auth, async (_, res) => {
  const kits = await prisma.pMKit.findMany({
    where: { model: 'WT-130' },
    include: { items: { include: { part: true } } },
    orderBy: { pmType: 'asc' },
  })
  res.json(kits)
})

export default router
