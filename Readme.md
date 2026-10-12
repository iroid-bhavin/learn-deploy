# Resource Booking

React + TypeScript frontend, Express + TypeScript API, PostgreSQL with Sequelize, Luxon for timezones.

## How to run

With Docker (Postgres included):

```bash
docker compose up --build
```

Open http://localhost:5173 and sign up. The API runs on http://localhost:8000. The database is created, constrained and seeded on startup. An admin account (`admin@example.com` / `Admin@1234`) is seeded too; only admins can create or edit resources and availability.

Without Docker, copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then:

```bash
cd server && npm install && npm run seed && npm run dev
cd client && npm install && npm run dev
```

Tests need Postgres with a `resource_booking_test` database. The Docker one already has it; point `server/.env` at it (`DB_PORT=5433`, `DB_PASSWORD=postgres`) and run:

```bash
cd server && npm test
```

## How I stop double-booking

The database does it, with an exclusion constraint on `bookings`:

```sql
EXCLUDE USING gist ("resourceId" WITH =, tstzrange("startTime", "endTime", '[)') WITH &&)
```

Postgres rejects any row whose time range overlaps another booking for the same resource, so two requests can never both get in. The violation (`23P01`) is returned as a 409. There is no SELECT-then-INSERT check in the code.

The insert also runs in a transaction that first locks the resource row (`SELECT ... FOR UPDATE`). Without it, parallel inserts sometimes deadlocked inside the constraint check and the loser got a 500 instead of a 409. With the lock they queue, and the loser always gets a clean 409.

`tests/concurrency.test.ts` fires 2 and then 10 parallel bookings at one slot and checks exactly one wins.

## Timezones and DST

- Each resource has an IANA timezone, and its weekly hours are stored as local wall-clock times in that zone.
- To build slots for a date, I take that date in the resource's zone, set the opening and closing times with Luxon, convert both to UTC, and then step forward in 30 real minutes. So "09:00 London" is 09:00Z in January and 08:00Z in July, the spring-forward night has fewer slots with nothing in the skipped hour, and the fall-back night lists the repeated hour twice as two different instants.
- Bookings are stored as UTC in `timestamptz`. The API only accepts times with an offset, and a booking must match a generated slot exactly, which is also how out-of-hours bookings are rejected.
- The frontend only formats: it shows those UTC instants in the timezone the user picks and says which one it is.
- Intervals are half-open `[start, end)`, so 09:00–09:30 and 09:30–10:00 don't conflict.

### Checking DST in the UI

Clocks change on a Sunday night, so Room A and Consultant C are also open Sunday 00:00–04:00. Pick one of these dates and set the display timezone to the resource's own zone:

| Case | Resource | Date | What you should see |
|---|---|---|---|
| Spring forward | Room A (London) | 28 Mar 2027 | 6 slots, nothing between 01:00 and 02:00 |
| Spring forward | Consultant C (New York) | 14 Mar 2027 | 6 slots, nothing between 02:00 and 03:00 |
| Fall back | Room A (London) | 25 Oct 2026 | 10 slots, 01:00–01:30 twice (UTC+1 and UTC+0) |
| Fall back | Consultant C (New York) | 1 Nov 2026 | 10 slots, 01:00–01:30 twice (UTC-4 and UTC-5) |

The slot the clocks change in is labelled with both offsets, e.g. `01:30 (UTC+1) → 01:00 (UTC+0)`, and has an info icon explaining it. These are future dates on purpose, because past slots can't be booked.

## Slot length

30 minutes, set in `server/src/config/booking.ts`.

## Assumptions

- The date the user picks is a date in the resource's timezone, not the viewer's.
- A booking is exactly one slot.
- Past dates can't be booked. Once a slot's start time has passed, the API rejects it with a 400, the UI shows it greyed out, and the date picker doesn't go back before today. Slots for past dates can still be listed, so DST checks on old dates work, they just can't be booked.

## With more time

- Lock and retry the reschedule endpoint the same way as create. It is still protected by the constraint, but can return a 500 under a race.
- Proper migrations instead of `sequelize.sync()` plus startup SQL.
- Slot length per resource, and holidays.
- Frontend tests for the time formatting, and a multi-day view instead of one date at a time.
