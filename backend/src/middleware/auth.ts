import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; clientId?: string }
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Нэвтрэх шаардлагатай' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as any
    next()
  } catch {
    res.status(401).json({ error: 'Хүчингүй токен' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Эрх хүрэлцэхгүй' })
    next()
  }
}
