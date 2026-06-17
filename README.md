# CineBook — Full-Stack Movie Ticket Booking Platform

A production-style movie ticket booking system (like BookMyShow) built with the MERN stack.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND  (React + Vite)                                      │
│  - Component-based UI, React Router, Axios with JWT interceptor│
│  - AuthContext (global state), SeatMap widget, Booking flow    │
└───────────────────────────────┬────────────────────────────────┘
                                │ REST API (JSON)
┌───────────────────────────────▼────────────────────────────────┐
│  BACKEND  (Express.js)                                         │
│  - Layered: Routes → Controllers → Services → Models           │
│  - JWT auth + Role-Based Access Control (admin / user)         │
│  - Validation (express-validator), Encryption (bcrypt)         │
│  - Standardized responses & centralized error handling         │
│  - Atomic seat-locking to prevent double booking               │
└───────────────────────────────┬────────────────────────────────┘
                                │ Mongoose ODM
┌───────────────────────────────▼────────────────────────────────┐
│  DATABASE  (MongoDB)                                           │
│  - Document schemas: User, Movie, Theatre, Screen, Show,       │
│    Booking, Review                                             │
│  - Text indexes for search, compound indexes for concurrency   │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Features & Concepts Covered

| Domain | What's Implemented |
|--------|--------------------|
| **Auth & Security** | JWT sign/verify, bcrypt password hashing, RBAC middleware (admin/user) |
| **API Design** | RESTful resource routes, request validation, pagination + sorting + search |
| **Database** | MongoDB + Mongoose, text indexes, document references, aggregation pipeline |
| **Booking Workflow** | Seat selection → Lock (temporary hold) → Confirm (atomic commit) → Cancel |
| **Concurrency** | Atomic single-document `findOneAndUpdate` prevents double-booking race conditions |
| **Seat Layout** | Configurable row-based screen model (premium/regular/recliner pricing) |
| **Reviews & Ratings** | CRUD reviews, denormalized rating summary on movie (aggregation pipeline refresh) |
| **Frontend** | React Router navigation, Context API state, Axios interceptors, component design |
| **Error Handling** | Operational errors via ApiError class, global error middleware, validation details |

---

## Tech Stack

- **Frontend:** React 18, React Router 6, Axios, Vite
- **Backend:** Node.js, Express 4, Mongoose 8
- **Database:** MongoDB
- **Auth:** JSON Web Tokens (jsonwebtoken), bcryptjs
- **Validation:** express-validator

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env   # edit MONGO_URI if needed
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
├── backend/
│   ├── src/
│   │   ├── config/        # db connection, env vars
│   │   ├── controllers/   # request handlers
│   │   ├── middleware/     # auth, validation, error handler
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── services/      # business logic (booking, seats, token)
│   │   ├── utils/         # ApiError, ApiResponse, asyncHandler
│   │   ├── seed/          # database seeder
│   │   ├── app.js         # Express app factory
│   │   └── server.js      # entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client with JWT interceptor
│   │   ├── components/    # Navbar, SeatMap, MovieCard, ProtectedRoute
│   │   ├── context/       # AuthContext (global state)
│   │   ├── pages/         # Home, Login, Register, MovieDetails, Booking, MyBookings
│   │   ├── styles.css     # Global stylesheet
│   │   ├── App.jsx        # Route definitions
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   └── package.json
└── README.md
```

---

## How Double Booking is Prevented

The system uses MongoDB's **atomic single-document updates** as the concurrency primitive:

1. **Lock phase:** `findOneAndUpdate` with a filter that requires the seat is NOT in `bookedSeats` AND NOT in active `locks`. Because MongoDB applies the filter and update atomically within a single document, two concurrent lock requests for the same seat can never both match — the second one fails the filter and receives a 409 Conflict.

2. **Confirm phase:** Moves seats from `locks` to `bookedSeats` in a transaction (or atomic fallback on standalone). Only succeeds if the seats are still locked by the requesting user and not yet expired.

3. **TTL expiry:** Each lock has an `expiresAt` timestamp. Expired locks are cleaned up before any availability check, so abandoned checkouts automatically release seats.

---

## License

MIT
