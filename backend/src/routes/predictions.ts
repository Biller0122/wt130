import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { auth, requireRole } from '../middleware/auth'
import { generatePredictions, generateServiceProposal } from '../services/aiService'

const router = Router()

router.get('/machine/:machineId', auth, async (req, res) => {
  const preds = await prisma.prediction.findMany({ where: { machineId: req.params.machineId, dismissed: false }, orderBy: { generatedAt: 'desc' } })
  res.json(preds)
})

router.post('/generate/:machineId', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try { res.json(await generatePredictions(req.params.machineId)) }
  catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.post('/proposal/:clientId', auth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try { res.json({ proposal: await generateServiceProposal(req.params.clientId) }) }
  catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.patch('/:id/dismiss', auth, async (req, res) => {
  await prisma.prediction.update({ where: { id: req.params.id }, data: { dismissed: true } })
  res.json({ ok: true })
})

export default router

// GET /api/predictions/status — Ollama ажиллаж байгаа эсэх
import { checkOllamaStatus } from '../services/aiService'
router.get('/status', async (_, res) => {
  try { res.json(await checkOllamaStatus()) }
  catch (e: any) { res.json({ running: false, error: e.message }) }
})
