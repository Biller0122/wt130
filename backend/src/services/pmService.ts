const PM_INTERVALS = [250, 500, 750, 1000, 1500, 2000]

export interface PMScheduleItem {
  interval: number
  nextSmr: number
  daysUntil: number
  urgency: 'critical' | 'warning' | 'normal'
}

export interface FleetStatus {
  nextPMInterval: number
  nextPMSmr: number
  nextPMDays: number
  urgency: 'critical' | 'warning' | 'normal'
  upcomingPMs: PMScheduleItem[]
  estimatedSmr: number
}

export function computeFleetStatus(currentSmr: number, dailyAvg: number, horizonDays = 60): FleetStatus {
  const upcoming: PMScheduleItem[] = []

  for (const iv of PM_INTERVALS) {
    const nextSmr = Math.ceil(currentSmr / iv) * iv
    const smrRemaining = nextSmr - currentSmr
    const daysUntil = dailyAvg > 0 ? Math.round(smrRemaining / dailyAvg) : 999

    if (daysUntil <= horizonDays) {
      upcoming.push({
        interval: iv,
        nextSmr,
        daysUntil,
        urgency: daysUntil <= 7 ? 'critical' : daysUntil <= 20 ? 'warning' : 'normal',
      })
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
  const nearest = upcoming[0]

  return {
    nextPMInterval: nearest?.interval ?? 250,
    nextPMSmr: nearest?.nextSmr ?? currentSmr + 250,
    nextPMDays: nearest?.daysUntil ?? 999,
    urgency: nearest?.urgency ?? 'normal',
    upcomingPMs: upcoming,
    estimatedSmr: Math.round(currentSmr),
  }
}

// Calculate parts needed for a given PM type across a fleet
export function calcPartsNeeded(
  pmKitItems: Array<{ partId: string; quantity: number; unit: string }>,
  machineCount: number
) {
  return pmKitItems.map(item => ({
    partId: item.partId,
    quantity: item.quantity * machineCount,
    unit: item.unit,
  }))
}

// Generate 2-month order list from upcoming PMs
export interface OrderSuggestion {
  partId: string
  partName: string
  pmRequired: number
  buffer: number
  totalQty: number
  unit: string
  urgent: boolean
}

export function generate2MonthOrderList(
  upcomingPMs: Array<{ interval: number; machineCount: number }>,
  pmKits: Map<number, Array<{ partId: string; partName: string; quantity: number; unit: string; stockQty: number; minStockQty: number }>>,
  stockMap: Map<string, number>
): OrderSuggestion[] {
  const totals = new Map<string, OrderSuggestion>()

  for (const pm of upcomingPMs) {
    const kit = pmKits.get(pm.interval)
    if (!kit) continue
    for (const item of kit) {
      const needed = item.quantity * pm.machineCount
      const existing = totals.get(item.partId)
      if (existing) {
        existing.pmRequired += needed
        existing.totalQty = existing.pmRequired + existing.buffer
      } else {
        const buffer = Math.ceil(needed * 0.2)
        totals.set(item.partId, {
          partId: item.partId,
          partName: item.partName,
          pmRequired: needed,
          buffer,
          totalQty: needed + buffer,
          unit: item.unit,
          urgent: (stockMap.get(item.partId) ?? 0) < item.minStockQty,
        })
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
}
