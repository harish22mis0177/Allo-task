# Allo Inventory — Take-Home Exercise

A multi-warehouse inventory and reservation system built with Next.js 14, Prisma, Supabase (PostgreSQL), TypeScript, and Tailwind CSS.

---

## 🏗️ Architecture Overview

```
Customer clicks "Reserve"
       ↓
POST /api/reservations
       ↓
BEGIN TRANSACTION
  SELECT * FROM Stock WHERE id = ? FOR UPDATE   ← row-level exclusive lock
  Check available = totalUnits - reserved
  If insufficient → 409 Conflict
  UPDATE Stock SET reserved = reserved + qty
  INSERT Reservation { status: PENDING, expiresAt: now+10min }
COMMIT
       ↓
Redirect to /checkout/[id]
       ↓
Customer clicks "Confirm" or "Cancel" (or timer runs out)
```

---

## ⚡ Concurrency Safety

The core of this system is PostgreSQL's `SELECT ... FOR UPDATE`. When two requests arrive simultaneously for the last unit:

1. Request A acquires the row lock → reads `available = 1` → creates reservation → commits
2. Request B waits for the lock → lock released → reads `available = 0` → returns **409 Conflict**

This is correct under all concurrency scenarios without needing Redis or application-level locks. Postgres serializes the competing writes at the database level.

---

## ⏱️ Expiry Mechanism

We use **lazy cleanup**: expired reservations are released at the start of every `GET /api/products` call.

```
GET /api/products
  → releaseExpiredReservations()
    → finds all PENDING where expiresAt < now()
    → sets status = RELEASED
    → decrements reserved count
  → return fresh stock data
```

**Why lazy cleanup?**
- Zero infrastructure: no cron job, no background worker, no Redis
- Correctness: stock always reflects reality at the moment of the read
- Tradeoff: a user could see stale stock between product list refreshes. The product page auto-refreshes every 30 seconds to mitigate this.
- For production: add a Vercel Cron job calling `/api/cron/cleanup` every 2 minutes for real-time cleanup.

---

## 🔑 Idempotency (Bonus)

Both `POST /api/reservations` and `POST /api/reservations/:id/confirm` support the `Idempotency-Key` header.

Implementation:
1. On each request, check `IdempotencyRecord` table for the key
2. If found → return stored response immediately (no side effects)
3. If not found → execute the operation, store the result with the key

The key is stored with the reservation ID and full response body, so retries always get the original response.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- A Supabase project (or any Postgres database)

### 1. Clone & Install
```bash
git clone <repo-url>
cd allo-inventory
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 3. Run migrations & seed
```bash
npm run db:push      # push schema to database
npm run db:seed      # seed with sample data
```

### 4. Start dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Supabase Setup

See **SUPABASE_SETUP.md** for detailed step-by-step instructions.

---

## 🧪 Testing

See **TESTING.md** for how to verify all endpoints and concurrency behavior.

---

## 🌐 Deployment (Vercel)

```bash
npm install -g vercel
vercel --prod
```

Set the same env vars in Vercel Dashboard → Project → Settings → Environment Variables.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── products/route.ts        # GET /api/products
│   │   ├── warehouses/route.ts      # GET /api/warehouses
│   │   └── reservations/
│   │       ├── route.ts             # POST /api/reservations
│   │       └── [id]/
│   │           ├── confirm/route.ts # POST /api/reservations/:id/confirm
│   │           └── release/route.ts # POST /api/reservations/:id/release
│   ├── checkout/[id]/page.tsx       # Checkout page with countdown
│   ├── layout.tsx
│   └── page.tsx                     # Product listing
├── components/
│   ├── ProductCard.tsx
│   └── CountdownTimer.tsx
├── lib/
│   ├── prisma.ts                    # Prisma singleton
│   ├── schemas.ts                   # Zod schemas
│   └── expiry.ts                    # Lazy expiry cleanup
└── types/index.ts
```

---

## ⚖️ Trade-offs & What I'd Do Differently

| Area | Current | Production |
|------|---------|------------|
| Expiry | Lazy on GET /api/products | Vercel Cron every 2 min |
| Locking | PostgreSQL FOR UPDATE | Same (Postgres is sufficient) |
| Idempotency | DB-based | Redis for speed |
| Auth | None | JWT / session tokens |
| Webhooks | None | Payment provider callbacks |
| Tests | Manual | Jest + Playwright |

---

## 📋 API Reference

| Method | Path | Description | Status Codes |
|--------|------|-------------|-------------|
| GET | /api/products | List products with available stock | 200 |
| GET | /api/warehouses | List all warehouses | 200 |
| POST | /api/reservations | Create reservation | 201, 400, 409 |
| POST | /api/reservations/:id/confirm | Confirm reservation | 200, 404, 410 |
| POST | /api/reservations/:id/release | Release reservation | 200, 404, 409 |
