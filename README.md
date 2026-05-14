# WT130 Service Platform

LOVOL WT-130 техникийн засвар үйлчилгээний цогц платформ.

## Технологийн стэк

| Давхарга | Технологи |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Lucide icons |
| State | Zustand + TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Anthropic Claude API |

## Структур

```
wt130-platform/
├── backend/           # Node.js + Express API
│   ├── prisma/        # DB схем + seed
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic (PM, AI)
│       ├── middleware/ # Auth
│       └── lib/       # Prisma client
└── frontend/          # React app
    └── src/
        ├── pages/     # Route pages
        ├── components/ # UI components
        ├── store/     # Zustand stores
        └── lib/       # API client
```

## Суулгах заавар

### 1. Шаардлага
- Node.js v18+
- PostgreSQL 14+
- npm v9+

### 2. Суулгалт

```bash
git clone <repo>
cd wt130-platform
npm install
npm install --workspace=backend
npm install --workspace=frontend
```

### 3. Database тохируулга

```bash
# PostgreSQL database үүсгэх
psql -U postgres -c "CREATE DATABASE wt130_db;"

# Backend .env үүсгэх
cp backend/.env.example backend/.env
# .env файл дотор DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY-г тохируулах

# Migration ажиллуулах
cd backend
npx prisma migrate dev --name init

# Seed data оруулах (WT130 флотын өгөгдөл)
npx ts-node prisma/seed.ts
```

### 4. Ажиллуулах

```bash
# Root directory-с
npm run dev
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## Нэвтрэх

| Роль | Email | Нууц үг |
|---|---|---|
| Admin | admin@company.mn | admin123 |
| Механик | mechanic@company.mn | mech123 |
| Харилцагч | burdel@burdel.mn | client123 |

## API Endpoints

```
POST /api/auth/login           # Нэвтрэх
GET  /api/dashboard            # Нийт дүүнэлт
GET  /api/machines             # Флотын жагсаалт
GET  /api/machines/:id         # Техникийн дэлгэрэнгүй
PATCH /api/machines/:id/smr   # SMR шинэчлэх

GET  /api/pm/schedule          # 60 хоногийн PM хуваарь
POST /api/pm/record            # PM бүртгэх
GET  /api/pm/order-list        # 2 сарын сэлбэгийн захиалга
GET  /api/pm/kits              # PM Kit тодорхойлолт

GET  /api/breakdowns           # Эвдрэлийн жагсаалт
POST /api/breakdowns           # Эвдрэл бүртгэх
PATCH /api/breakdowns/:id      # Эвдрэл шинэчлэх
GET  /api/breakdowns/stats     # Статистик

GET  /api/inventory            # Сэлбэгийн жагсаалт
GET  /api/inventory/low-stock  # Дутагдалтай сэлбэг
PATCH /api/inventory/:id/stock # Нөөц шинэчлэх

POST /api/orders               # Захиалга үүсгэх
GET  /api/orders               # Захиалгын жагсаалт

POST /api/predictions/generate/:machineId  # AI таамаглал
POST /api/predictions/proposal/:clientId   # Үйлчилгээний санал
```

## Дараагийн шат (Phase 2)

- [ ] Email мэдэгдэл (PM ойртсон үед автомат)
- [ ] Excel/PDF тайлан гаргах
- [ ] Mobile-д тохирсон харагдалт
- [ ] SMR автомат шинэчлэлт (GPS/telematics)
- [ ] Олон компанийн дэмжлэг (multi-tenant)
- [ ] Сэлбэгийн ханган нийлүүлэгчтэй холболт
