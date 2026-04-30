# Vehicle Fuel Consumption Manager

A full-stack web application for tracking fuel consumption of cars and motorcycles. Built with **Express.js**, **Handlebars (HBS)**, **Express-Session**, **CSRF-Sync**, and **JWT** following a strict **MVC** architecture.

The app exposes both:
- A traditional **Server-Side Rendered Web UI** secured by sessions and CSRF tokens.
- A **RESTful JSON API** secured by signed JWT bearer tokens.

---

## Features

- Register / Login (Session for Web, JWT for API)
- CRUD for fuel records: `Date`, `Vehicle Type` (Car / Motorcycle), `Liters`, `Distance (km)`, `Total Cost`
- Per-record **km/L** and **Cost/km** computed automatically
- **Weekly** and **Monthly** expenditure aggregation (ISO weeks)
- CSRF protection on every state-changing form
- JWT authentication on every state-changing API endpoint
- Light, professional UI with a soft blue palette
- File-based JSON store (`data/db.json`) — no database setup required

---

## Project Structure (MVC)

```
.
├── server.js                 # Express bootstrap, view engine, sessions, CSRF, error handlers
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── controllers/              # Controllers - request handlers, no rendering logic
│   ├── authController.js
│   ├── recordsController.js
│   ├── apiAuthController.js
│   └── apiRecordsController.js
├── models/                   # Models - data shape, validation, persistence
│   ├── store.js              # JSON file persistence layer
│   ├── User.js
│   └── FuelRecord.js
├── middleware/
│   ├── sessionAuth.js        # requireSession / attachUser / redirectIfAuthed
│   └── jwtAuth.js            # signToken / requireJwt
├── routes/
│   ├── web.js                # Web (SSR) routes
│   └── api.js                # JSON API routes
├── utils/
│   └── stats.js              # Weekly + monthly aggregation
├── views/                    # Handlebars views
│   ├── layouts/main.hbs
│   ├── login.hbs
│   ├── register.hbs
│   ├── dashboard.hbs
│   ├── add-record.hbs
│   ├── edit-record.hbs
│   ├── summary.hbs
│   └── error.hbs
├── public/
│   └── css/style.css
└── data/                     # Auto-created on first run
    └── db.json
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18 or later
- npm

### 2. Install
```bash
npm install
```

### 3. Environment
Copy `.env.example` to `.env` and customize the secrets:
```bash
cp .env.example .env
```

Required variables:
| Variable          | Description                                  |
|-------------------|----------------------------------------------|
| `PORT`            | HTTP port (default `3000`)                   |
| `SESSION_SECRET`  | Secret key used by `express-session`         |
| `JWT_SECRET`      | Secret used to sign JWT tokens               |
| `JWT_EXPIRES_IN`  | JWT lifetime (e.g. `1h`, `7d`)               |
| `NODE_ENV`        | `development` or `production`                |

### 4. Run
```bash
npm start
```

Then open: <http://localhost:3000>

The first run creates `data/db.json` automatically.

---

## Web UI (Handlebars + Sessions + CSRF)

| Route                     | Method | Auth      | Purpose                          |
|---------------------------|--------|-----------|----------------------------------|
| `/login`                  | GET    | Public    | Login form                       |
| `/login`                  | POST   | CSRF      | Sign in (creates session)        |
| `/register`               | GET    | Public    | Registration form                |
| `/register`               | POST   | CSRF      | Create account + sign in         |
| `/logout`                 | POST   | Session+CSRF | Destroy session               |
| `/dashboard`              | GET    | Session   | Records list + totals            |
| `/summary`                | GET    | Session   | Weekly + monthly aggregates      |
| `/records/new`            | GET    | Session   | Add-record form                  |
| `/records`                | POST   | Session+CSRF | Create record                 |
| `/records/:id/edit`       | GET    | Session   | Edit form                        |
| `/records/:id/update`     | POST   | Session+CSRF | Update record                 |
| `/records/:id/delete`     | POST   | Session+CSRF | Delete record                 |

Every form rendered by the server includes a hidden `_csrf` token. The `csrf-sync` package validates the token against the user's session on every `POST` / `PUT` / `DELETE`.

---

## REST API (JWT)

Base URL: `/api`

Visit `GET /api` for a self-describing endpoint listing.

### Auth
| Endpoint              | Method | Body                                      | Returns                |
|-----------------------|--------|-------------------------------------------|------------------------|
| `/api/register`       | POST   | `{ "username", "password" }`              | `{ user, token }`      |
| `/api/login`          | POST   | `{ "username", "password" }`              | `{ user, token }`      |
| `/api/me`             | GET    | _Authorization: Bearer &lt;token&gt;_     | `{ user }`             |

### Records (all require `Authorization: Bearer <token>`)
| Endpoint              | Method | Description                  |
|-----------------------|--------|------------------------------|
| `/api/records`        | GET    | List my records              |
| `/api/records`        | POST   | Create a record              |
| `/api/records/:id`    | GET    | Get a single record          |
| `/api/records/:id`    | PUT    | Update a record              |
| `/api/records/:id`    | DELETE | Delete a record              |
| `/api/summary`        | GET    | Totals + weekly + monthly    |

### Example: get a JWT and list records
```bash
# 1) Register
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"hunter22"}'

# 2) Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"hunter22"}'
# => { "user": {...}, "token": "eyJhbGciOi..." }

# 3) Create a record
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"date":"2026-04-30","vehicleType":"Car","liters":35.2,"distance":410,"totalCost":48.75}'

# 4) List records
curl http://localhost:3000/api/records \
  -H "Authorization: Bearer <TOKEN>"

# 5) Summary (weekly + monthly)
curl http://localhost:3000/api/summary \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Security Notes

- **Sessions** — `express-session` cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- **CSRF** — `csrf-sync` synchroniser pattern; tokens are compared against the user's session on every mutating request.
- **JWT** — HS256-signed tokens with configurable expiry; tokens never share state with the session cookie.
- **Passwords** — Hashed with `bcryptjs` (10 rounds) before storage.
- **Scope isolation** — Web routes use sessions+CSRF. API routes use JWT only and never read session cookies.

---

## Calculations

- **km/L (per record)** = `distance / liters`
- **Cost/km (per record)** = `totalCost / distance`
- **Weekly grouping** — ISO 8601 week numbers (`YYYY-Www`)
- **Monthly grouping** — `YYYY-MM`
- **Group km/L** — `sum(distance) / sum(liters)`

---

## Submission Checklist

- [x] MVC folder structure (controllers / models / views + middleware + routes + utils)
- [x] Session authentication for the Web UI
- [x] JWT authentication for the API
- [x] CSRF protection on every state-changing web form
- [x] Full CRUD for fuel records
- [x] Weekly and monthly expenditure aggregation
- [x] `.env.example` provided
- [x] `npm start` boots the server with no errors
- [x] `.gitignore` excludes `node_modules/`, `.env`, and local data
