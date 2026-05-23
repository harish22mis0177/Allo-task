# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** → Sign in with GitHub
3. Click **New project**
4. Fill in:
   - **Name**: `allo-inventory`
   - **Database Password**: (choose a strong password — save it!)
   - **Region**: `South Asia (Mumbai)` for best latency from India
5. Click **Create new project** — wait ~2 minutes

---

## Step 2: Get Your Connection Strings

1. Go to your project → **Settings** (gear icon) → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab — you'll see two options:

### Connection Pooler (for app runtime — use port 6543)
```
postgresql://postgres.[ref]:[your-password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
→ This goes in `DATABASE_URL`

### Direct Connection (for migrations — use port 5432)
```
postgresql://postgres.[ref]:[your-password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```
→ This goes in `DIRECT_URL`

---

## Step 3: Configure Your .env.local

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESERVATION_EXPIRY_MINUTES="10"
```

Replace `[PROJECT-REF]` and `[PASSWORD]` with your actual values.

---

## Step 4: Push Schema & Seed

```bash
npm run db:push    # Creates all tables in Supabase
npm run db:seed    # Populates with sample data
```

You should see:
```
🌱 Seeding database...
✅ Seed complete!
   3 warehouses, 6 products, 14 stock entries
```

---

## Step 5: Verify in Supabase Table Editor

1. Go to your Supabase project → **Table Editor**
2. You should see these tables:
   - `Product` — 6 rows
   - `Warehouse` — 3 rows
   - `Stock` — 14 rows
   - `Reservation` — 0 rows (empty until someone reserves)
   - `IdempotencyRecord` — 0 rows

---

## Step 6: Check Row Level Security (RLS)

By default, Supabase enables RLS which can block Prisma. Since we're using service-level access via the connection string (not Supabase client), this is fine — Prisma connects directly to PostgreSQL and bypasses RLS.

If you see permission errors, go to **Authentication** → **Policies** and disable RLS for all tables, or use the service role key.

---

## Useful Supabase Features to Monitor

### Logs
Go to **Logs** → **Postgres Logs** to see all SQL queries in real-time. You can watch the `SELECT ... FOR UPDATE` locking in action.

### SQL Editor
Run raw SQL to inspect data:
```sql
-- Check available stock
SELECT 
  p.name,
  w.name as warehouse,
  s."totalUnits",
  s.reserved,
  s."totalUnits" - s.reserved as available
FROM "Stock" s
JOIN "Product" p ON s."productId" = p.id
JOIN "Warehouse" w ON s."warehouseId" = w.id
ORDER BY p.name, w.name;

-- Check all reservations
SELECT 
  r.id,
  r.status,
  r.quantity,
  r."expiresAt",
  p.name as product,
  w.name as warehouse
FROM "Reservation" r
JOIN "Stock" s ON r."stockId" = s.id
JOIN "Product" p ON s."productId" = p.id
JOIN "Warehouse" w ON s."warehouseId" = w.id
ORDER BY r."createdAt" DESC;
```

### Realtime (Optional Enhancement)
Supabase supports Postgres Realtime subscriptions. You could subscribe to `Reservation` table changes to push live updates to all connected clients without polling.
