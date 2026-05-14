import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', auth, async (_, res) => {
  const orders = await prisma.order.findMany({
    include: { items: { include: { part: true, machine: { select: { parkNumber: true } } } } },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  res.json(orders)
})

router.post('/', auth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { type, notes, items } = req.body
  const order = await prisma.order.create({
    data: {
      type: type || 'PLANNED', notes, createdBy: req.user!.id,
      items: { create: items.map((i: any) => ({ partId: i.partId, machineId: i.machineId, quantity: i.quantity, unit: i.unit || 'ш', reason: i.reason, urgent: i.urgent || false })) },
    },
    include: { items: { include: { part: true } } },
  })
  res.json(order)
})

router.patch('/:id/status', auth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status, approvedBy: req.user!.id } })
  res.json(order)
})

export default router
