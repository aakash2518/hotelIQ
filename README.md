# 🏨 HotelIQ — Agentic Travel Marketing Intelligence

> An AI-powered hotel marketing platform that autonomously researches market trends, makes campaign decisions, and executes targeted marketing campaigns using a 3-agent pipeline.

---

## ✨ Features

- **🤖 3-Agent AI Pipeline** — Research → Decisioning → Execution, fully automated
- **📊 Live Dashboard** — Real-time metrics, price trend charts, campaign performance
- **🏨 Hotel Price Intelligence** — Tracks 30 hotels across 6 cities with 90-day price history
- **📣 Campaign Management** — Create, track and optimize email/push/SMS campaigns
- **🔍 Agent Logs** — Full audit trail of every AI decision with confidence scores
- **⚡ Auto Feedback Loop** — Cron job updates campaign metrics and retrains agent context

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **AI / LLM** | Google Gemini (free), Groq, LangChain |
| **Database** | PostgreSQL (Supabase) + Prisma ORM |
| **Monorepo** | npm Workspaces |
| **Observability** | Custom structured logger (pino-style) |

---

## 📁 Project Structure

```
hotelIQ/
├── apps/
│   ├── api/          # Express backend (port 4000)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── agents/       # AI agent logic (research, decisioning, execution)
│   └── observability/# Shared logging & tracing middleware
└── package.json      # Root workspace config
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & Install

```bash
git clone <repo-url>
cd hotelIQ
npm install
```

### 2. Configure Environment

Copy the example env and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
# LLM Provider (gemini is free)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key

# Supabase Connection (use pooler URL for IPv4 compatibility)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

PORT=4000
NODE_ENV=development
```

> **Getting your Supabase URLs:** Dashboard → Project Settings → Database → Connection Pooler

### 3. Setup Database

```bash
cd apps/api

# Push Prisma schema to Supabase
DATABASE_URL="<your-direct-url>" npx prisma db push

# Seed with sample data (30 hotels, 8 campaigns, 15 agent logs)
DATABASE_URL="<your-direct-url>" npx tsx prisma/seed.ts
```

> ⚠️ Use the **Direct URL (port 5432)** for `db push` and `seed` — the pooler URL (port 6543) is for runtime only.

### 4. Run the Project

```bash
# From root — starts both API and Web simultaneously
cd hotelIQ
npm run dev
```

Or run individually:

```bash
# Terminal 1 — API (http://localhost:4000)
cd apps/api && npm run dev

# Terminal 2 — Web (http://localhost:3000)
cd apps/web && npm run dev
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:3000 |
| API Backend | http://localhost:4000 |
| Health Check | http://localhost:4000/health |

---

## 🤖 AI Agent Pipeline

```
User Query
    ↓
┌─────────────────┐
│  Research Agent  │  ← Analyzes hotel prices, detects anomalies
└────────┬────────┘
         ↓
┌──────────────────────┐
│  Decisioning Agent    │  ← Recommends city, segment, channel
└────────┬─────────────┘
         ↓
┌──────────────────┐
│  Execution Agent  │  ← Generates content, saves campaign to DB
└──────────────────┘
```

Trigger via API:
```bash
curl -X POST http://localhost:4000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{"query": "Find luxury hotel opportunities in Paris"}'
```

---

## 📡 API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |

### Hotels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotels` | List all hotels with latest price |
| GET | `/api/hotels/:id` | Get hotel with full price history |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | Agent system info |
| GET | `/api/agents/status` | Live agent status & recent activity |
| GET | `/api/agents/logs` | Agent execution logs |
| POST | `/api/agents/run` | Run full 3-agent workflow |
| POST | `/api/agents/research` | Run research agent only |
| POST | `/api/agents/decision` | Run decisioning agent only |
| PUT | `/api/agents/campaigns/:id/metrics` | Update campaign metrics |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | ✅ | `gemini`, `groq`, `openai`, or `ollama` |
| `GEMINI_API_KEY` | ✅ (if using Gemini) | Free at [aistudio.google.com](https://aistudio.google.com) |
| `GROQ_API_KEY` | Optional | Free at [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | ✅ | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | ✅ | Supabase direct URL (port 5432, for migrations) |
| `PORT` | Optional | API port (default: `4000`) |
| `NODE_ENV` | Optional | `development` or `production` |

---

## 📦 Available Scripts

```bash
npm run dev      # Start all apps in dev mode
npm run build    # Build all apps
npm run lint     # Lint all apps
npm run clean    # Clean all build artifacts
```

---

## 🗃️ Database Schema

| Table | Description |
|-------|-------------|
| `Hotel` | Hotel properties (name, city, country, star rating) |
| `HotelPrice` | Daily prices per hotel per source (booking.com, expedia, hotels.com) |
| `HotelEmbedding` | Vector embeddings for semantic search |
| `Campaign` | Marketing campaigns with AI decisions and metrics |
| `AgentLog` | Full audit log of every AI agent execution |

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

<p align="center">Built with ❤️ using Google Gemini AI + Supabase + Next.js</p>
