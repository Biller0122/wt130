import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'

const router = Router()

router.get('/', auth, async (req, res) => {
  const { low, warehouseId } = req.query
  const where: any = {}
  if (warehouseId === 'unassigned') where.warehouseId = null
  else if (warehouseId) where.warehouseId = warehouseId as string
  const parts = await prisma.part.findMany({ where, orderBy: { category: 'asc' } })
  res.json(low === 'true' ? parts.filter(p => p.stockQty <= p.minStockQty) : parts)
})

router.patch('/:id/stock', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { qty, operation } = req.body
  const part = await prisma.part.findUnique({ where: { id: req.params.id } })
  if (!part) return res.status(404).json({ error: 'Олдсонгүй' })
  const newQty = operation === 'add' ? part.stockQty + parseFloat(qty) : parseFloat(qty)
  const updated = await prisma.part.update({ where: { id: req.params.id }, data: { stockQty: newQty } })
  res.json(updated)
})

router.patch('/:id/warehouse', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { warehouseId } = req.body
  const updated = await prisma.part.update({
    where: { id: req.params.id },
    data: { warehouseId: warehouseId || null },
  })
  res.json(updated)
})

router.get('/low-stock', auth, async (_, res) => {
  const parts = await prisma.part.findMany()
  res.json(parts.filter(p => p.stockQty <= p.minStockQty).map(p => ({ ...p, shortage: p.minStockQty - p.stockQty })))
})

export default router
