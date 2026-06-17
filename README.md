# CineBook -- Full-Stack Movie Ticket Booking Platform

A production-style movie ticket booking system (like BookMyShow) built with React, Express, Sequelize, and PostgreSQL.

---

## Architecture Overview

```
+-----------------------------------------------------------------+
|  FRONTEND  (React + Vite)                                       |
|  - Component-based UI, React Router, Axios with JWT interceptor |
|  - AuthContext (global state), SeatMap widget, Booking flow     |
+-------------------------------+---------------------------------+
                                | REST API (JSON)
+-------------------------------v---------------------------------+
|  BACKEND  (Express.js)                                          |
|  - Layered: Routes -> Controllers -> Services -> Models         |
|  - JWT auth + Role-Based Access Control (admin / user)          |
|  - Validation (express-validator), Encryption (bcrypt)          |
|  - Standardized responses & centralized error handling          |
|  - Row-level locking + unique constraints for concurrency       |
+-------------------------------+---------------------------------+
                                | Sequelize ORM
+-------------------------------v---------------------------------+
|  DATABASE  (PostgreSQL)                                         |
|  - Relational schemas: User, Movie, Theatre, Screen, Show,     |
|    Booking, Review, SeatLock                                    |
|  - UUID primary keys, JSONB for flexible data (seat layouts)    |
|  - Unique constraints + transactions for concurrency control    |
+-----------------------------------------------------------------+
```

---

## Key Features & Concepts Covered

| Domain | What's Implemented |
|--------|--------------------|
| **Auth & Security** | JWT sign/verify, bcrypt password hashing, RBAC middleware (admin/user) |
| **API Design** | RESTful resource routes, request validation, pagination + sorting + search |
| **Database** | PostgreSQL + Sequelize ORM, UUID primary keys, JSONB columns, unique constraints |
| **Booking Workflow** | Seat selection -> Lock (temporary hold) -> Confirm (atomic commit) -> Cancel |
| **Concurrency** | PostgreSQL row-level locking (SELECT FOR UPDATE) + unique constraint on SeatLock(showId, seat) prevents double-booking |
| **Seat Layout** | Configurable row-based screen model (premium/regular/recliner pricing) stored as JSONB |
| **Reviews & Ratings** | CRUD reviews, denormalized rating summary on movie (aggregation refresh) |
| **Frontend** | React Router navigation, Context API state, Axios interceptors, component design |
| **Error Handling** | Operational errors via ApiError class, global error middleware, validation details |

---

## Tech Stack

- **Frontend:** React 18, React Router 6, Axios, Vite
- **Backend:** Node.js, Express 4, Sequelize 6 (ORM)
- **Database:** PostgreSQL (with SQLite fallback for testing)
- **Auth:** JSON Web Tokens (jsonwebtoken), bcryptjs
- **Validation:** express-validator
- **Deployment:** Vercel (serverless functions for backend, static hosting for frontend)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (see free providers below)

### Free PostgreSQL Providers

You do not need to install PostgreSQL locally. Use one of these free hosted options:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Neon](https://neon.tech) | 0.5 GB storage, serverless | No credit card required, great for serverless deployments |
| [Supabase](https://supabase.com) | 500 MB, 2 projects | Includes a full Postgres instance + REST API |
| [Railway](https://railway.app) | $5 free credit/month | One-click PostgreSQL provisioning |

After creating a database, copy the connection string (it looks like `postgresql://user:pass@host:5432/dbname`) and set it as `DATABASE_URL`.

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
# Example: DATABASE_URL=postgresql://user:password@host:5432/moviebooking
npm install
npm run seed           # populate demo data
npm run dev            # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # starts on http://localhost:5173
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/moviebooking` |
| `JWT_SECRET` | Secret key for signing JWTs | `dev_secret_change_me` |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `PORT` | Server port | `5000` |
| `CLIENT_URL` | Allowed CORS origins (comma-separated) | `http://localhost:5173` |
| `SEAT_LOCK_TTL_SECONDS` | How long seat locks last | `300` |

### Demo Credentials (after seeding)

| Role  | Email              | Password   |
|-------|--------------------|-----------|
| Admin | admin@example.com  | admin123  |
| User  | user@example.com   | user123   |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | - | Health check |
| POST | `/api/auth/register` | - | Register new user |
| POST | `/api/auth/login` | - | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Current user info |
| GET | `/api/movies` | - | List movies (search, pagination, sort) |
| GET | `/api/movies/:id` | - | Movie details |
| POST | `/api/movies` | Admin | Create movie |
| PUT | `/api/movies/:id` | Admin | Update movie |
| DELETE | `/api/movies/:id` | Admin | Delete movie |
| GET | `/api/movies/:id/reviews` | - | List reviews (paginated) |
| POST | `/api/movies/:id/reviews` | Bearer | Create/update review |
| DELETE | `/api/movies/:id/reviews/:rid` | Bearer | Delete review |
| GET | `/api/theatres` | - | List theatres (?city=) |
| GET | `/api/theatres/:id` | - | Theatre + screens |
| POST | `/api/theatres` | Admin | Create theatre |
| POST | `/api/theatres/:id/screens` | Admin | Add screen with seat layout |
| GET | `/api/shows` | - | List upcoming shows |
| GET | `/api/shows/:id` | - | Show + live seat map |
| POST | `/api/shows` | Admin | Schedule a show |
| POST | `/api/bookings/lock` | Bearer | Hold seats (5 min TTL) |
| POST | `/api/bookings/confirm` | Bearer | Confirm booking |
| POST | `/api/bookings/release` | Bearer | Release held seats |
| GET | `/api/bookings/me` | Bearer | My bookings |
| DELETE | `/api/bookings/:id` | Bearer | Cancel booking |

---

## Project Structure

```
FullStack/
+-- backend/
|   +-- src/
|   |   +-- config/        # db connection (Sequelize), env vars
|   |   +-- controllers/   # request handlers
|   |   +-- middleware/     # auth, validation, error handler
|   |   +-- models/        # Sequelize models + associations
|   |   +-- routes/        # Express routers
|   |   +-- services/      # business logic (booking, seats, token)
|   |   +-- utils/         # ApiError, ApiResponse, asyncHandler
|   |   +-- seed/          # database seeder
|   |   +-- app.js         # Express app factory
|   |   +-- server.js      # entry point
|   +-- api/               # Vercel serverless entry point
|   +-- scripts/           # verify.mjs integration tests
|   +-- package.json
+-- frontend/
|   +-- src/
|   |   +-- api/           # Axios client with JWT interceptor
|   |   +-- components/    # Navbar, SeatMap, MovieCard, ProtectedRoute
|   |   +-- context/       # AuthContext (global state)
|   |   +-- pages/         # Home, Login, Register, MovieDetails, Booking, MyBookings
|   |   +-- styles.css     # Global stylesheet
|   |   +-- App.jsx        # Route definitions
|   |   +-- main.jsx       # Entry point
|   +-- index.html
|   +-- package.json
+-- README.md
```

---

## How Double Booking is Prevented

The system uses PostgreSQL's **row-level locking** and **unique constraints** as concurrency primitives:

1. **Unique constraint on SeatLock(showId, seat):** When a user attempts to lock a seat, a row is inserted into the `seat_locks` table. The unique constraint ensures that only one lock can exist for any (show, seat) combination. If two concurrent requests try to lock the same seat, only one INSERT succeeds; the other receives a unique constraint violation error (409 Conflict).

2. **SELECT FOR UPDATE (row-level locking):** During the confirm phase, the system uses `SELECT FOR UPDATE` on the relevant SeatLock rows and the Show row. This pessimistic lock serializes concurrent confirms, ensuring that bookedSeats is updated atomically without lost writes.

3. **Transactions:** Both the lock and confirm phases execute inside database transactions. If any step fails, all changes are rolled back, preventing partial state.

4. **TTL expiry:** Each lock has an `expiresAt` timestamp. Expired locks are cleaned up before any availability check, so abandoned checkouts automatically release seats.

---

## Running Tests

The project includes an integration test script that uses SQLite in-memory (no external database required):

```bash
cd backend
npm install          # installs sqlite3 as a devDependency
node scripts/verify.mjs
```

This runs the full API test suite covering authentication, RBAC, movie CRUD, booking workflows, concurrency (parallel seat lock race conditions), and reviews.

---
<!-- CI/CD verified -->
## License

MIT
