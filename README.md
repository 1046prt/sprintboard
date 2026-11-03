# [SprintBoard](https://sprintboard2026.vercel.app/)

A small issue tracker I built to learn how real-time apps fit together. You can create projects, add issues, assign them to people, and watch changes show up on everyone's screen without a refresh.

**Live demo:** https://sprintboard2026.vercel.app/

It's a Vite + React client talking to an Express API, with MongoDB for storage and Socket.IO for the live bits.

Screenshots for the member and admin views are in [`public/assets/screenshots/`](./public/assets/screenshots/).

## Project structure

```text
.
├── client/
│   ├── src/
│   │   ├── api/          API client + service functions
│   │   ├── components/   shared UI and issue components
│   │   ├── context/      auth and socket providers
│   │   ├── hooks/        reusable hooks
│   │   └── pages/        screens
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/       env + db setup
│   │   ├── controllers/  route handlers
│   │   ├── middleware/   auth, validation, error handling
│   │   ├── models/       mongoose schemas
│   │   ├── routes/       route definitions
│   │   ├── services/     activity + project stats
│   │   ├── validators/   zod schemas
│   │   ├── app.js        express app
│   │   ├── server.js     http + socket.io startup
│   │   └── socket.js     socket auth and broadcasts
│   └── package.json
├── .env.example
└── package.json
```

## Getting started

You'll need Node 18+ and a MongoDB instance (local or Atlas).

Install everything from the root:

```bash
npm run install:all
```

Copy `.env.example` to `server/.env` and fill it in:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/sprintboard
JWT_SECRET=some_long_random_string
```

Then run the server and client in two terminals:

```bash
npm run dev:server
npm run dev:client
```

Client is on `http://localhost:5173`, API on `http://localhost:5000`. Vite proxies `/api` and `/socket.io` to the server in dev, so the client needs no env vars locally.

### Demo data

```bash
npm run seed
```

Heads up: this wipes users, projects, issues and activity before inserting the demo records. Only run it against a dev database.

## How permissions work

Collections: `users` (accounts, roles, reporting lines), `projects` (name, description, owner), `issues` (details, status, priority, project, creator, assignee) and `activities` (readable activity entries).

The API enforces these rules:

- Any logged-in user can see the workspace and create projects or issues
- Project owners and admins can edit or delete a project
- Anyone can change an issue's status
- Issue creators, project owners and admins can edit or delete an issue
- Only admins can manage roles and reporting relationships

Statuses are `todo`, `in-progress` and `done`. Priorities are `low`, `medium` and `high`.

## API

Protected routes need a token:

```http
Authorization: Bearer <token>
```

**Auth and health**

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/api/health` | Is the API up |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, get a token |
| GET | `/api/auth/profile` | Current user |

**Projects, issues and the rest**

| Method | Route | What it does |
| --- | --- | --- |
| GET, POST | `/api/projects` | List or create projects |
| GET, PUT, DELETE | `/api/projects/:id` | Read, update or delete a project |
| GET | `/api/projects/:id/activity` | Project activity |
| GET, POST | `/api/issues` | List or create issues |
| GET, PUT, DELETE | `/api/issues/:id` | Read, update or delete an issue |
| PATCH | `/api/issues/:id/status` | Change status |
| GET | `/api/dashboard/stats` | Dashboard numbers |
| GET | `/api/team` | Users the current user can see |

The issue list takes `status`, `priority`, `project`, `assignedTo`, `search`, `sort`, `page` and `limit`. For example:

```text
/api/issues?status=in-progress&priority=high&search=login&page=1&limit=10
```

## Deploying

**API** (`server/` as a Node service):

```text
Build:  npm install
Start:  npm start
```

Env vars on your host:

```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_secret
CLIENT_ORIGIN=https://your-frontend.example.com
```

The server reads `PORT` from the platform, so don't hardcode it.

**Client**: set the API URLs before building:

```env
VITE_API_URL=https://your-api.example.com/api
VITE_SOCKET_URL=https://your-api.example.com
```

```bash
npm run build
```

Then upload `client/dist` to any static host. I'm hosting the client on Vercel at https://sprintboard2026.vercel.app/.

## Build and tests

From the root:

```bash
npm run build
npm test
```

The build checks that the client bundles properly. Server tests run on `node:test`, but there aren't many yet. Drop new test files into `server/tests/` as you add coverage.