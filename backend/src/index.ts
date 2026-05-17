import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth'
import machineRoutes from './routes/machines'
import pmRoutes from './routes/pm'
import breakdownRoutes from './routes/breakdowns'
import inventoryRoutes from './routes/inventory'
import orderRoutes from './routes/orders'
import predictionRoutes from './routes/predictions'
import dashboardRoutes from './routes/dashboard'
import chatRoutes from './routes/chat'
import importRoutes from './routes/import'
import warehouseRoutes from './routes/warehouses'
import { startScheduler } from './lib/scheduler'
import advisoryRoutes from './routes/advisory'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))

app.use('/api/auth', authRoutes)
app.use('/api/machines', machineRoutes)
app.use('/api/pm', pmRoutes)
app.use('/api/breakdowns', breakdownRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/import', importRoutes)
app.use('/api/warehouses', warehouseRoutes)
app.use('/api/advisory', advisoryRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
  startScheduler()
})

export default app
