import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'
import { computeFleetStatus } from '../services/pmService'

const router = Router()

function proximity(machineLocation: string | null, warehouseLocation: string | null): number {
  if (!machineLocation || !warehouseLocation) return 999
  const ml = machineLocation.toLowerCase().trim()
  const wl = warehouseLocation.toLowerCase().trim()
  if (ml === wl) return 0
  if (ml.includes(wl) || wl.includes(ml)) return 1
  const mlWords = ml.split(/[\s,]+/)
  const wlWords = wl.split(/[\s,]+/)
  const overlap = mlWords.filter(w => w.length > 1 && wlWords.includes(w)).length
  if (overlap > 0) return 2
  return 999
}

router.get('/', auth, requireRole('ADMIN', 'MANAGER'), async (_, res) => {
  const [machines, warehouses, allParts, kits] = await Promise.all([
    prisma.machine.findMany({
      where: { status: { in: ['ACTIVE', 'IN_REPAIR'] } },
      orderBy: { parkNumber: 'asc' },
    }),
    prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    prisma.part.findMany(),
    prisma.pMKit.findMany({
      where: { model: 'WT-130' },
      include: { items: { include: { part: true } } },
    }),
  ])

  const pmKitMap = new Map(kits.map(k => [k.pmType, k.items]))

  // Нэрээр бүлэглэсэн агуулахын бараа
  const partsByName = new Map<string, typeof allParts>()
  for (const p of allParts) {
    const key = p.name.toLowerCase().trim()
    if (!partsByName.has(key)) partsByName.set(key, [])
    partsByName.get(key)!.push(p)
  }

  const result = []

  for (const machine of machines) {
    const { upcomingPMs } = computeFleetStatus(machine.currentSmr, machine.dailyAvgSmr, 60)

    const predictions = await prisma.prediction.findMany({
      where: { machineId: machine.id, dismissed: false },
      orderBy: { riskLevel: 'asc' },
      take: 5,
    })

    if (upcomingPMs.length === 0 && predictions.length === 0) continue

    // Агуулахыг ойртой зааж эрэмблэнэ
    const rankedWarehouses = warehouses
      .map(w => ({ ...w, prox: proximity(machine.location, w.location) }))
      .sort((a, b) => a.prox - b.prox)

    const nearestWh = rankedWarehouses[0] ?? null

    const partAdvisories: any[] = []

    for (const pm of upcomingPMs) {
      const kit = pmKitMap.get(pm.interval)
      if (!kit) continue

      for (const item of kit) {
        const name = item.part.name.toLowerCase().trim()
        const needed = item.quantity
        const candidates = partsByName.get(name) ?? []

        // Ойрхон агуулахаас хайна
        let foundAtNearest = false
        for (const wh of rankedWarehouses) {
          const stock = candidates.find(p => p.warehouseId === wh.id)
          if (stock && stock.stockQty >= needed) {
            partAdvisories.push({
              partName: item.part.name,
              partId: item.partId,
              needed,
              unit: item.unit,
              fromPM: pm.interval,
              daysUntil: pm.daysUntil,
              status: wh.id === nearestWh?.id ? 'ok' : 'other_warehouse',
              sourceWarehouse: { id: wh.id, name: wh.name, location: wh.location, prox: wh.prox },
              inStock: stock.stockQty,
              nearestHas: wh.id === nearestWh?.id,
            })
            foundAtNearest = true
            break
          }
        }

        if (!foundAtNearest) {
          // Ямар ч агуулахд хүрэлцэхгүй
          const alternatives = rankedWarehouses.map(wh => {
            const stock = candidates.find(p => p.warehouseId === wh.id)
            return { warehouseId: wh.id, name: wh.name, location: wh.location, inStock: stock?.stockQty ?? 0 }
          }).filter(w => w.inStock > 0)

          partAdvisories.push({
            partName: item.part.name,
            partId: item.partId,
            needed,
            unit: item.unit,
            fromPM: pm.interval,
            daysUntil: pm.daysUntil,
            status: 'unavailable',
            nearestHas: false,
            alternatives,
            inStock: 0,
          })
        }
      }
    }

    result.push({
      id: machine.id,
      parkNumber: machine.parkNumber,
      location: machine.location,
      currentSmr: machine.currentSmr,
      dailyAvgSmr: machine.dailyAvgSmr,
      nearestWarehouse: nearestWh
        ? { id: nearestWh.id, name: nearestWh.name, location: nearestWh.location, prox: nearestWh.prox }
        : null,
      upcomingPMs,
      partAdvisories,
      predictions: predictions.map(p => ({
        riskLevel: p.riskLevel,
        title: p.title,
        recommendation: p.recommendation,
      })),
    })
  }

  res.json(result)
})

export default router
