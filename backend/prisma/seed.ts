import { PrismaClient, Role, MachineStatus, PartCategory, BreakdownStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.mn' },
    update: {},
    create: { email: 'admin@company.mn', password: adminPass, name: 'Админ', role: Role.ADMIN },
  })

  const mechPass = await bcrypt.hash('mech123', 10)
  await prisma.user.upsert({
    where: { email: 'mechanic@company.mn' },
    update: {},
    create: { email: 'mechanic@company.mn', password: mechPass, name: 'Механик', role: Role.MECHANIC },
  })

  // ── Client ───────────────────────────────────────────────────────────────
  const burdel = await prisma.client.upsert({
    where: { id: 'client-burdel' },
    update: {},
    create: { id: 'client-burdel', name: 'Burdel Mining LLC', phone: '+976 9900 0000', email: 'info@burdel.mn' },
  })

  const clientPass = await bcrypt.hash('client123', 10)
  await prisma.user.upsert({
    where: { email: 'burdel@burdel.mn' },
    update: {},
    create: { email: 'burdel@burdel.mn', password: clientPass, name: 'Burdel Менежер', role: Role.CLIENT, clientId: burdel.id },
  })

  // ── Machines (HT fleet) ──────────────────────────────────────────────────
  const fleetData = [
    { parkNumber: 'HT-2001', currentSmr: 2036, lastPM: 2000, daily: 14.9 },
    { parkNumber: 'HT-2002', currentSmr: 1797, lastPM: 1750, daily: 15.5 },
    { parkNumber: 'HT-2003', currentSmr: 2426, lastPM: 250,  daily: 14.3 },
    { parkNumber: 'HT-2004', currentSmr: 1099, lastPM: 1000, daily: 7.1  },
    { parkNumber: 'HT-2005', currentSmr: 2095, lastPM: 1750, daily: 13.1 },
    { parkNumber: 'HT-2006', currentSmr: 2130, lastPM: 2000, daily: 14.4 },
    { parkNumber: 'HT-2007', currentSmr: 2140, lastPM: 2000, daily: 14.6 },
    { parkNumber: 'HT-2008', currentSmr: 718,  lastPM: 500,  daily: 13.6 },
    { parkNumber: 'HT-2009', currentSmr: 1900, lastPM: 1750, daily: 14.0 },
    { parkNumber: 'HT-2010', currentSmr: 2173, lastPM: 2000, daily: 15.2 },
    { parkNumber: 'HT-2011', currentSmr: 2145, lastPM: 2000, daily: 15.6 },
    { parkNumber: 'HT-2012', currentSmr: 2020, lastPM: 2000, daily: 14.1 },
    { parkNumber: 'HT-2013', currentSmr: 2244, lastPM: 250,  daily: 15.4 },
    { parkNumber: 'HT-2014', currentSmr: 2191, lastPM: 1750, daily: 14.2 },
    { parkNumber: 'HT-2015', currentSmr: 1043, lastPM: 1000, daily: 11.0 },
    { parkNumber: 'HT-2016', currentSmr: 1884, lastPM: 1500, daily: 14.9 },
  ]

  for (const m of fleetData) {
    await prisma.machine.upsert({
      where: { parkNumber: m.parkNumber },
      update: { currentSmr: m.currentSmr, dailyAvgSmr: m.daily },
      create: {
        parkNumber: m.parkNumber,
        model: 'WT-130',
        manufacturer: 'LOVOL',
        location: 'Их говь',
        status: MachineStatus.ACTIVE,
        currentSmr: m.currentSmr,
        dailyAvgSmr: m.daily,
        clientId: burdel.id,
        lastSmrDate: new Date('2025-06-23'),
      },
    })
  }

  // ── Parts catalogue ──────────────────────────────────────────────────────
  const parts = [
    { code: 'OIL-FILTER-001', name: 'Хөдөлгүүрийн масло шүүр', category: PartCategory.OIL_FILTER, unit: 'ш', stockQty: 12, minStockQty: 20, unitPrice: 15000 },
    { code: 'FUEL-FILTER-001', name: 'Түлшний шүүр (доод)', category: PartCategory.FUEL_FILTER, unit: 'ш', stockQty: 8, minStockQty: 15, unitPrice: 12000 },
    { code: 'FUEL-FILTER-002', name: 'Хос түлшний шүүр', category: PartCategory.FUEL_FILTER, unit: 'ш', stockQty: 10, minStockQty: 20, unitPrice: 11000 },
    { code: 'FUEL-FILTER-003', name: 'Тунгаагуурт түлшний шүүр', category: PartCategory.FUEL_FILTER, unit: 'ш', stockQty: 14, minStockQty: 25, unitPrice: 13500 },
    { code: 'AIR-FILTER-001', name: 'Агаар шүүгч (дотор)', category: PartCategory.AIR_FILTER, unit: 'ш', stockQty: 6, minStockQty: 10, unitPrice: 45000 },
    { code: 'AIR-FILTER-002', name: 'Агаар шүүгч (гадна)', category: PartCategory.AIR_FILTER, unit: 'ш', stockQty: 6, minStockQty: 10, unitPrice: 35000 },
    { code: 'AIR-FILTER-003', name: 'Кабины агаар шүүгч', category: PartCategory.AIR_FILTER, unit: 'ш', stockQty: 4, minStockQty: 8, unitPrice: 25000 },
    { code: 'TRANS-FILTER-001', name: 'Трансмисс шүүр', category: PartCategory.TRANSMISSION_FILTER, unit: 'ш', stockQty: 3, minStockQty: 5, unitPrice: 55000 },
    { code: 'HYD-FILTER-001', name: 'Гидрийн шүүр', category: PartCategory.HYDRAULIC_FILTER, unit: 'ш', stockQty: 3, minStockQty: 5, unitPrice: 48000 },
    { code: 'ENG-OIL-001', name: 'Хөдөлгүүрийн масло 10W40', category: PartCategory.ENGINE_OIL, unit: 'л', stockQty: 240, minStockQty: 500, unitPrice: 4500 },
    { code: 'TRANS-FLUID-001', name: 'Трансмисс шингэн SAE30', category: PartCategory.TRANSMISSION_FLUID, unit: 'л', stockQty: 60, minStockQty: 80, unitPrice: 5200 },
    { code: 'BELT-001', name: 'Динамны ремень', category: PartCategory.BELT, unit: 'ш', stockQty: 2, minStockQty: 5, unitPrice: 85000 },
    { code: 'BELT-002', name: 'Сэнсний ремень', category: PartCategory.BELT, unit: 'ш', stockQty: 2, minStockQty: 4, unitPrice: 65000 },
    { code: 'TIRE-001', name: 'Дугуй шпилька (32мм)', category: PartCategory.TIRE_PARTS, unit: 'ш', stockQty: 45, minStockQty: 80, unitPrice: 8500 },
    { code: 'DRIVE-001', name: 'Гожук болт (дотоод)', category: PartCategory.DRIVETRAIN, unit: 'ш', stockQty: 8, minStockQty: 30, unitPrice: 12000 },
    { code: 'DRIVE-002', name: 'Лап (муфт) элемент', category: PartCategory.DRIVETRAIN, unit: 'ш', stockQty: 1, minStockQty: 5, unitPrice: 180000 },
    { code: 'DRIVE-003', name: 'Кардан хэрчим', category: PartCategory.DRIVETRAIN, unit: 'ш', stockQty: 0, minStockQty: 2, unitPrice: 320000 },
    { code: 'ELEC-001', name: 'Гэрлийн гал хамгаалагч', category: PartCategory.ELECTRICAL, unit: 'ш', stockQty: 5, minStockQty: 10, unitPrice: 6500 },
    { code: 'BRAKE-001', name: 'Диск (brake disc)', category: PartCategory.BRAKE, unit: 'ш', stockQty: 1, minStockQty: 3, unitPrice: 250000 },
  ]

  const createdParts: Record<string, string> = {}
  for (const p of parts) {
    const part = await prisma.part.upsert({
      where: { code: p.code },
      update: { stockQty: p.stockQty },
      create: p,
    })
    createdParts[p.code] = part.id
  }

  // ── PM Kits ──────────────────────────────────────────────────────────────
  const pmKits: Array<{ pmType: number; items: Array<{ code: string; qty: number; unit: string }> }> = [
    {
      pmType: 250,
      items: [
        { code: 'OIL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'ENG-OIL-001', qty: 30, unit: 'л' },
      ],
    },
    {
      pmType: 500,
      items: [
        { code: 'OIL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-002', qty: 2, unit: 'ш' },
        { code: 'FUEL-FILTER-003', qty: 2, unit: 'ш' },
        { code: 'ENG-OIL-001', qty: 30, unit: 'л' },
      ],
    },
    {
      pmType: 1000,
      items: [
        { code: 'OIL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-002', qty: 2, unit: 'ш' },
        { code: 'FUEL-FILTER-003', qty: 2, unit: 'ш' },
        { code: 'AIR-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'AIR-FILTER-002', qty: 1, unit: 'ш' },
        { code: 'ENG-OIL-001', qty: 30, unit: 'л' },
        { code: 'TIRE-001', qty: 18, unit: 'ш' },
      ],
    },
    {
      pmType: 2000,
      items: [
        { code: 'OIL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'FUEL-FILTER-002', qty: 2, unit: 'ш' },
        { code: 'FUEL-FILTER-003', qty: 2, unit: 'ш' },
        { code: 'AIR-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'AIR-FILTER-002', qty: 1, unit: 'ш' },
        { code: 'AIR-FILTER-003', qty: 1, unit: 'ш' },
        { code: 'TRANS-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'HYD-FILTER-001', qty: 1, unit: 'ш' },
        { code: 'ENG-OIL-001', qty: 30, unit: 'л' },
        { code: 'TRANS-FLUID-001', qty: 15, unit: 'л' },
      ],
    },
  ]

  for (const kit of pmKits) {
    const existing = await prisma.pMKit.findUnique({ where: { model_pmType: { model: 'WT-130', pmType: kit.pmType } } })
    if (!existing) {
      await prisma.pMKit.create({
        data: {
          model: 'WT-130',
          pmType: kit.pmType,
          items: {
            create: kit.items.map(i => ({ partId: createdParts[i.code], quantity: i.qty, unit: i.unit })),
          },
        },
      })
    }
  }

  // ── Sample breakdowns (from FOM data) ────────────────────────────────────
  const machines = await prisma.machine.findMany({ take: 2 })
  const bkSamples = [
    { category: 'Хүч дамжуулах', description: 'Гожукны 5ш болт тасарсан', downtimeHrs: 4.0, status: BreakdownStatus.RESOLVED },
    { category: 'Хөдөлгүүр', description: 'Хөдөлгүүр зуурсан — агаар шүүгч бохирдол', downtimeHrs: 11.5, status: BreakdownStatus.RESOLVED },
    { category: 'Цахилгаан & Асаах', description: 'Динамны ремень тасарсан', downtimeHrs: 2.5, status: BreakdownStatus.RESOLVED },
    { category: 'Дугуй солих', description: '5-р дугуй хагарсан', downtimeHrs: 1.5, status: BreakdownStatus.RESOLVED },
    { category: 'Хүч дамжуулах', description: 'Лап холболт суларсан', downtimeHrs: 3.0, status: BreakdownStatus.OPEN },
  ]
  if (machines[0]) {
    for (const b of bkSamples) {
      await prisma.breakdown.create({
        data: {
          machineId: machines[0].id,
          ...b,
          reportedAt: new Date(Date.now() - Math.random() * 30 * 86400000),
        },
      })
    }
  }

  console.log('✅ Seed complete')
  console.log('   Admin: admin@company.mn / admin123')
  console.log('   Mechanic: mechanic@company.mn / mech123')
  console.log('   Client: burdel@burdel.mn / client123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
