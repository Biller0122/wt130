import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth, AuthRequest } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email }, include: { client: true } })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Имэйл эсвэл нууц үг буруу' })

    const token = jwt.sign(
      { id: user.id, role: user.role, clientId: user.clientId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, client: user.client },
    })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.get('/me', auth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { client: true },
    omit: { password: true } as any,
  })
  res.json(user)
})

export default router
