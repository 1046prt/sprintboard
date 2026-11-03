# SprintBoard

A real-time collaborative issue tracker. Users create projects, add issues, set priorities, move issues through a workflow and watch the dashboard and activity feed update live across browsers.

Built with the MERN stack (MongoDB, Express, React, Node) plus Socket.IO.

## Features

**Core**
- Registration and login with JWT auth, bcrypt-hashed passwords, protected API routes and protected frontend routes
- Projects: create, list, view, update, delete. Only the creator (or an admin) can edit or delete a project
- Issues: create, edit, delete and change status (To Do / In Progress / Done) with Low / Medium / High priority
- Dashboard: total projects, total issues, open, in progress, completed and high-priority counts, plus status and priority breakdowns and recent activity
- Filtering by status, priority and project, done on the server through query parameters
- Title search handled by the backend (empty queries are ignored, regex characters are escaped, over-long terms are rejected) with a 400 ms debounce on the frontend
- Activity log: created, updated and status-changed events are stored and shown on the project page ("Hritik changed status of "Fix login" from To Do to In Progress")

**Bonus**
- Real-time updates with Socket.IO. Changes made by one user appear for everyone else without a refresh
- Role-based access: `admin` and `member`
- Backend pagination (`?page=1&limit=10`)

**Quality**
- Request validation (zod) with field-level error messages
- Consistent JSON errors and meaningful status codes (400, 401, 403, 404, 409, 413, 500)
- Loading, empty and error states on every screen, responsive layout, accessible dialogs

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, React Router 6, Axios, Socket.IO client, Vite |
| Backend | Node.js, Express 4, Mongoose 8, Socket.IO, zod, helmet, express-rate-limit |
| Database | MongoDB |
| Auth | JSON Web Tokens, bcryptjs |
| Tests | `node:test`, supertest, mongodb-memory-server |

## Project structure

```
sprintboard/
├── client/                 # React application (Vite)
│   └── src/
│       ├── api/            # axios instance and API service functions
│       ├── components/     # shared UI, forms, issue list, activity feed
│       ├── context/        # auth and socket providers
│       ├── hooks/          # useDebounce, useLiveUpdates
│       └── pages/          # dashboard, projects, project details, issues, auth
├── server/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # env and database connection
│   │   ├── controllers/    # request handlers
│   │   ├── middleware/     # auth, validation, error handling
│   │   ├── models/         # User, Project, Issue, Activity
│   │   ├── routes/
│   │   ├── services/       # activity logging, project statistics
│   │   ├── validators/     # zod schemas
│   │   ├── app.js          # express app (used by the tests)
│   │   ├── server.js       # http + socket.io + database startup
│   │   └── socket.js
│   └── tests/
├── .env.example
└── README.md
```

## Installation

Requirements: Node.js 18+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
# 1. install both apps
npm run install:all

# 2. configure the API
cp .env.example server/.env
#    then edit server/.env and set MONGODB_URI and JWT_SECRET

# 3. start the API (http://localhost:5000)
npm run dev:server

# 4. in a second terminal, start the client (http://localhost:5173)
npm run dev:client
```

Open http://localhost:5173 and create an account. In development the Vite server proxies `/api` and `/socket.io` to the API, so the client needs no configuration.

To try the real-time features, open the app in two browsers (or one normal and one private window), log in as different users and change an issue in one of them.

### Optional demo data

```bash
npm run seed
```

This wipes the collections and creates two users (`admin@sprintboard.dev` and `member@sprintboard.dev`, password `Password123`) with two projects and six issues.

### Production build

```bash
npm run build                  # outputs client/dist
npm start --prefix server      # API only
```

Serve `client/dist` from any static host. If the API lives on another origin, build the client with `VITE_API_URL` and `VITE_SOCKET_URL` set (see `.env.example`) and set `CLIENT_ORIGIN` on the server to the client's URL.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no (5000) | API port |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret used to sign tokens. Use a long random value |
| `JWT_EXPIRES_IN` | no (7d) | Token lifetime |
| `CLIENT_ORIGIN` | no | Comma-separated allowed origins for CORS and sockets |
| `ADMIN_EMAILS` | no | Comma-separated emails that get the `admin` role on registration |

Never commit a real `.env` file. It is listed in `.gitignore`.

## API

All routes except register and login need `Authorization: Bearer <token>`. Errors look like `{ "message": "...", "details": [{ "field": "...", "message": "..." }] }`.

### Auth
| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, password }` → `201 { user, token }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/profile` | Current user |

### Projects
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/projects` | All projects with per-status issue counts (`?mine=true` for your own) |
| POST | `/api/projects` | `{ name, description? }` |
| GET | `/api/projects/:id` | Project details and issue counts |
| PUT | `/api/projects/:id` | Owner or admin only |
| DELETE | `/api/projects/:id` | Owner or admin only. Also removes the project's issues and activity |
| GET | `/api/projects/:id/activity` | Recent activity (`?limit=20`, max 50) |

### Issues
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/issues` | List with filters, search and pagination |
| POST | `/api/issues` | `{ title, projectId, description?, status?, priority? }` |
| GET | `/api/issues/:id` | Single issue |
| PUT | `/api/issues/:id` | Update fields |
| PATCH | `/api/issues/:id/status` | `{ status }` |
| DELETE | `/api/issues/:id` | Delete |

`GET /api/issues` query parameters:

| Parameter | Values |
| --- | --- |
| `status` | `todo`, `in-progress`, `done` |
| `priority` | `low`, `medium`, `high` |
| `project` | project id |
| `search` | text matched against the title, case-insensitive. Empty means no search, max 100 characters |
| `sort` | `newest` (default), `oldest` |
| `page`, `limit` | default `1` and `10`, limit max 100 |

```
GET /api/issues?status=in-progress&priority=high&search=login&page=1&limit=10
→ { "issues": [...], "pagination": { "page": 1, "limit": 10, "total": 3, "pages": 1 } }
```

### Dashboard
`GET /api/dashboard/stats` returns `totalProjects`, `totalIssues`, `openIssues`, `inProgressIssues`, `completedIssues`, `highPriorityIssues`, `byPriority` and `recentActivity`.

### Real-time events
Clients connect to Socket.IO with `auth: { token }`. The server emits `issue:created|updated|deleted`, `project:created|updated|deleted` and `stats:changed`. The payloads only carry ids, and clients refetch what they are showing.

## Permissions

| Action | Who |
| --- | --- |
| View projects, issues, dashboard | any signed-in user |
| Create projects and issues | any signed-in user |
| Edit or delete a project | its creator, or an admin |
| Change an issue's status | any signed-in user (so teammates can move work along) |
| Edit or delete an issue | the issue's creator, the owner of its project, or an admin |

## Data model

- **User**: name, email (unique), password (bcrypt hash, never returned), role, createdAt
- **Project**: name, description, createdBy → User, createdAt
- **Issue**: title, description, status, priority, project → Project, createdBy → User, createdAt. Indexed for the common filter combinations
- **Activity**: user → User, issue → Issue, project → Project, type, action (readable sentence), createdAt

## Tests

```bash
npm test
```

The API tests (auth, authorization, validation, filtering, search, pagination, activity log, dashboard counts) run against an in-memory MongoDB. `mongodb-memory-server` downloads a MongoDB binary the first time, so the first run needs internet access.

## Design notes

- Controllers stay thin. Validation lives in zod schemas, authorization in `utils/permissions.js`, and activity logging in a service.
- Passwords are limited to 72 characters because bcrypt ignores everything beyond that.
- Login returns the same error for an unknown email and a wrong password.
- Search input is escaped before it reaches the `$regex` query.
- Roles cannot be chosen at registration. Admins come from `ADMIN_EMAILS`.
- Deleting a project removes its issues and activity in order (children first), because standalone MongoDB has no transactions. A failed delete can simply be retried.
- On the client, only the newest issue request may update the screen, so rapid typing or filter changes never show stale results.
