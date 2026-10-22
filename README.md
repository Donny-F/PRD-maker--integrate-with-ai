<h1 align="center">PRD Maker</h1>

<p align="center">
  <strong>Turn a product idea into a structured PRD and an auto-laid-out flow diagram.</strong>
</p>

<p align="center">
  AI clarification · streamed PRD generation · automatic diagrams · linear version history
</p>

![PRD Maker landing page](docs/screenshots/landing-page.png)

## Demo

▶️ **[Watch the PRD Maker demo on YouTube](https://www.youtube.com/watch?v=VIDEO_ID)**

<!--
GitHub strips <iframe> embeds from README files. Once the video is published,
replace VIDEO_ID in the link above with the real YouTube video ID. For a
clickable thumbnail instead, replace the link with:

[![Watch the PRD Maker demo](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)
-->

## Overview

PRD Maker turns a rough product idea into a reviewable Product Requirements Document and a visual architecture diagram. It asks targeted clarification questions, streams the PRD as it is written, lays out the diagram automatically, and keeps every iteration in a linear version history.

The repository is a Turborepo monorepo with a Next.js frontend, an Express API, PostgreSQL/Prisma persistence, and an OpenAI-compatible LLM layer for Google Gemini and DeepSeek.

## Screenshots

### Create a new PRD

![Create a new PRD](docs/screenshots/new-prd.png)

### Generated result

![Generated PRD document](docs/screenshots/prd-document.png)

![Generated architecture diagram](docs/screenshots/diagram-canvas.png)

## Features

- **AI clarification loop** — the model turns the initial idea into 3–5 targeted questions; you can answer them or skip straight to generation.
- **Real-time PRD streaming** — Server-Sent Events stream markdown into the viewer, with copy, regenerate, and `.md` download actions.
- **Automatic flow diagrams** — the model returns Zod-validated nodes and edges; Dagre computes a left-to-right layout and React Flow renders a pan/zoom canvas with PNG export.
- **Linear version history** — every revision is stored as a new version. Rolling back creates a new snapshot marked `Reverted from vN` instead of deleting history.
- **Project workspace** — reopen past PRDs, switch between versions, and delete projects from the dashboard.
- **Admin console** — manage LLM configurations, encrypted API keys, availability cooldowns, and user roles.
- **Secure authentication** — Google/GitHub OAuth through NextAuth, signed JWTs between frontend and backend, and role-based access to admin routes.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Diagrams | React Flow (`@xyflow/react`), `@dagrejs/dagre`, `html-to-image` |
| Backend | Express 4, TypeScript, Zod, Server-Sent Events |
| Data | PostgreSQL 16, Prisma ORM |
| Auth | NextAuth.js (JWT), Google/GitHub OAuth, role-based access |
| AI | OpenAI-compatible SDK, Google Gemini, DeepSeek |
| Tooling | Turborepo, pnpm workspaces |

## Architecture

```mermaid
flowchart LR
  UI["Next.js frontend<br/>(App Router)"] -->|REST + SSE| API["Express API"]
  UI -->|OAuth| IDP["Google / GitHub"]
  API -->|Prisma| DB[("PostgreSQL")]
  API -->|OpenAI-compatible| LLM["Gemini / DeepSeek"]
```

The backend owns all LLM calls. API keys are decrypted only inside the backend, and the frontend receives only masked key metadata.

## Project Structure

```text
.
├── apps/
│   ├── backend/          # Express API, SSE streams, Prisma schema and seed
│   └── frontend/         # Next.js App Router UI
├── packages/
│   └── typescript-config/
├── docker-compose.yml    # PostgreSQL 16
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm 12.14.0 (`corepack enable`)
- Docker Desktop, or a PostgreSQL 16 instance
- A Google and/or GitHub OAuth app
- A Google AI Studio and/or DeepSeek API key for real AI output

Without an API key, the backend streams deterministic sample content so the UI can still be explored locally.

### 1. Clone and install

```bash
git clone https://github.com/your-username/prd-maker.git
cd prd-maker
corepack enable
pnpm install
```

Replace `your-username` after creating the GitHub repository.

### 2. Create the environment files

Create a root `.env` for Docker Compose:

```env
POSTGRES_DB=prd_maker
POSTGRES_USER=prd_maker
POSTGRES_PASSWORD=prd_maker
POSTGRES_PORT=5432
```

Create `apps/backend/.env` from the example:

```env
PORT=5000
DATABASE_URL=postgresql://prd_maker:prd_maker@localhost:5432/prd_maker?schema=public
AUTH_SECRET=replace-with-a-long-random-secret
ENCRYPTION_MASTER_KEY=replace-with-a-64-character-hex-key
ADMIN_SEED_EMAIL=you@example.com
CORS_ORIGIN=http://localhost:3000
```

Create `apps/frontend/.env.local` from the example:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-the-same-value-as-AUTH_SECRET
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Important:

- `AUTH_SECRET` and `NEXTAUTH_SECRET` must be the same value. The frontend forwards a signed backend token, and the API validates it with this shared secret.
- Generate secrets with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Register these OAuth callback URLs:
  - Google: `http://localhost:3000/api/auth/callback/google`
  - GitHub: `http://localhost:3000/api/auth/callback/github`
- `ADMIN_SEED_EMAIL` must match the OAuth account email you will use. The seeder creates that user with the `ADMIN` role.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

The compose file creates a PostgreSQL 16 container and a named volume for local data.

### 4. Migrate and seed

```bash
pnpm db:migrate
pnpm db:seed
```

The seed creates the admin user from `ADMIN_SEED_EMAIL` and the default Gemini/DeepSeek model entries. If the API keys are present in the backend `.env`, the seeder encrypts and stores them.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with the OAuth account that matches `ADMIN_SEED_EMAIL`, and open `/admin` to manage models and keys.

## Usage

1. Sign in with Google or GitHub.
2. Open **Buat PRD Baru** and choose an LLM.
3. Enter a project title and describe the product idea.
4. Answer the AI clarification questions, or skip them.
5. Watch the PRD stream into the markdown viewer; the diagram is generated automatically when the stream finishes.
6. Send revision instructions to create a new version, or roll back to an earlier version.
7. Download `project-prd.md` or `project-prd.png` from the workspace.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the frontend and backend in watch mode |
| `pnpm build` | Build all workspace packages |
| `pnpm start` | Start the built apps |
| `pnpm lint` | Lint all workspace packages |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Seed the admin user and default LLM configs |
| `pnpm db:studio` | Open Prisma Studio |

## API Overview

All `/projects` and `/users` routes require `Authorization: Bearer <backend JWT>`. The SSE endpoints use the same header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/auth/me` | Current user profile |
| `GET` | `/api/v1/llms` | Active LLM configurations |
| `POST` | `/api/v1/projects/clarifications` | Generate clarification questions |
| `POST` | `/api/v1/projects` | Create a project |
| `GET` | `/api/v1/projects` | List the current user's projects |
| `GET` | `/api/v1/projects/:id` | Fetch a project with its versions |
| `GET` | `/api/v1/projects/:id/stream-prd` | Stream PRD generation (SSE) |
| `POST` | `/api/v1/projects/:id/generate-diagram` | Generate diagram JSON |
| `GET` | `/api/v1/projects/:id/stream-revision` | Stream a revision (SSE) |
| `POST` | `/api/v1/projects/:id/revert` | Create a rollback snapshot |
| `DELETE` | `/api/v1/projects/:id` | Delete a project |
| Admin | `/api/v1/llms/admin`, `/api/v1/users` | Manage LLM configs and user roles |

## Security Notes

- LLM API keys are encrypted at rest with AES-256-GCM using `ENCRYPTION_MASTER_KEY`.
- The API never returns decrypted keys; the admin UI only receives masked values.
- The backend verifies every request with the shared JWT secret and reloads the current role from PostgreSQL.
- Admin routes require the `ADMIN` role. The API prevents an admin from demoting themselves and keeps at least one admin account.

## License

Released under the [MIT License](LICENSE).
