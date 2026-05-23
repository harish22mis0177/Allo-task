# Testing Guide

## Prerequisites
- App running at `http://localhost:3000`
- Database seeded (`npm run db:seed`)

---

## 1. Basic Flow Test (UI)

### Happy Path
1. Open `http://localhost:3000`
2. You should see 6 products with warehouse stock levels
3. Pick any product with available stock
4. Select a warehouse, set quantity, click **Reserve Now**
5. You are redirected to `/checkout/[id]`
6. Verify the countdown timer starts at ~10:00
7. Click **Confirm Purchase**
8. Banner shows "Order Confirmed!" ✅
9. Go back to products → that warehouse's stock is decremented

### Cancel Flow
1. Go to product listing → Reserve a product
2. On checkout page, click **Cancel**
3. Banner shows "Reservation Cancelled" 🔓
4. Go back → stock is restored

---

## 2. API Tests (curl)

### List products
```bash
curl http://localhost:3000/api/products | jq '.[0]'
```

### List warehouses
```bash
curl http://localhost:3000/api/warehouses | jq '.'
```

### Create reservation
First get a stockId:
```bash
STOCK_ID=$(curl -s http://localhost:3000/api/products | jq -r '.[0].stock[0].id')
echo "Stock ID: $STOCK_ID"
```

Then reserve:
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-001" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}" | jq '.'
```

Save the reservation ID:
```bash
RES_ID="<id from above response>"
```

### Confirm reservation
```bash
curl -X POST http://localhost:3000/api/reservations/$RES_ID/confirm \
  -H "Idempotency-Key: confirm-test-001" | jq '.'
```

### Release reservation (create a new one first)
```bash
curl -X POST http://localhost:3000/api/reservations/$RES_ID/release | jq '.'
```

---

## 3. Concurrency Test (Race Condition)

This tests that only ONE of two simultaneous requests for the last unit succeeds.

### Step 1: Find a product with exactly 1 unit
The seeded Logitech MX Master at Delhi Central Hub has 1 unit.

```bash
curl -s http://localhost:3000/api/products | jq '.[] | select(.name | contains("MX Master")) | .stock[] | select(.warehouseName | contains("Delhi"))'
```

Get the stockId for that entry.

### Step 2: Fire two simultaneous requests
```bash
STOCK_ID="<stock id with 1 unit>"

curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}" &

curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}" &

wait
```

**Expected result:**
- One request returns `201` with reservation details
- Other request returns `409 { "error": "Not enough stock..." }`

### Step 3: Verify in Supabase
```sql
SELECT status, quantity FROM "Reservation" ORDER BY "createdAt" DESC LIMIT 5;
SELECT "totalUnits", reserved FROM "Stock" WHERE id = '<stock_id>';
```
- Should see 1 PENDING reservation
- `reserved = 1`, `totalUnits - reserved = 0`

---

## 4. Expiry Test

### Manual expiry simulation
In Supabase SQL editor, set a reservation to expired:
```sql
UPDATE "Reservation"
SET "expiresAt" = NOW() - INTERVAL '1 minute'
WHERE status = 'PENDING'
LIMIT 1;
```

Then call GET /api/products — the lazy cleanup will run and release it:
```bash
curl http://localhost:3000/api/products > /dev/null
```

Check Supabase:
```sql
SELECT status FROM "Reservation" ORDER BY "createdAt" DESC LIMIT 3;
-- Should show RELEASED
SELECT reserved FROM "Stock" WHERE id = '<stock_id>';
-- Should be back to 0
```

---

## 5. Idempotency Test

Same Idempotency-Key returns same response without double-booking:
```bash
STOCK_ID="<any available stock id>"

# First call
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-xyz" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}"

# Second call with same key — should return SAME response, no new reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-xyz" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}"
```

Check Supabase — should have only 1 reservation, not 2:
```sql
SELECT COUNT(*) FROM "Reservation";
SELECT COUNT(*) FROM "IdempotencyRecord";
```

---

## 6. 410 Gone Test (Expired Confirmation)

```bash
# Create a reservation
RES_ID=$(curl -s -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d "{\"stockId\": \"$STOCK_ID\", \"quantity\": 1}" | jq -r '.id')

# Expire it in SQL
# (run in Supabase SQL editor)
# UPDATE "Reservation" SET "expiresAt" = NOW() - INTERVAL '1 min' WHERE id = '<RES_ID>';

# Try to confirm — should get 410
curl -X POST http://localhost:3000/api/reservations/$RES_ID/confirm
# Expected: {"error":"Reservation has expired"} with status 410
```

---

## 7. Checklist

- [ ] Products load with correct available stock
- [ ] Reserving decrements available stock immediately
- [ ] Countdown timer counts down in real-time
- [ ] Confirming shows success state and decrements totalUnits
- [ ] Cancelling restores stock and shows released state
- [ ] Concurrent requests for last unit: exactly one 201, one 409
- [ ] Expired reservation returns 410 on confirm
- [ ] Same Idempotency-Key returns same response
- [ ] Out-of-stock products show disabled Reserve button
- [ ] Expired reservations auto-release on GET /api/products
