# 🚐 Matatu Route Intelligence Agent

> **GDG Nairobi Agentathon 2026** — Decentralized Nairobi transit routing via SMS, powered by Gemini 2.5 Pro.

A crowd-sourced, AI-driven matatu routing agent that processes raw SMS input from Kenyan commuters. It classifies intents, generates route guidance, ingests live transit reports, and enforces a strict 160-character SMS output — all through a single shortcode.

---

## Architecture

```
  ┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
  │  Commuter    │ SMS │  Africa's Talking    │ POST│  Express     │
  │  (+254...)   │────▶│  Shortcode 20880     │────▶│  Webhook     │
  │              │◀────│  SMS Gateway         │◀────│  /sms/incoming│
  └──────────────┘     └─────────────────────┘     └──────┬───────┘
                                                          │
                                              ┌───────────▼───────────┐
                                              │   Route Agent         │
                                              │   (Orchestrator)      │
                                              │                       │
                                              │  1. Extract hints     │
                                              │  2. Pre-fetch context │
                                              │  3. Gemini 2.5 Pro    │
                                              │  4. Persist reports   │
                                              │  5. Log & reply       │
                                              └───┬──────────┬───────┘
                                                  │          │
                                    ┌─────────────▼┐  ┌──────▼──────┐
                                    │  Vertex AI    │  │  Supabase   │
                                    │  Gemini 2.5   │  │  PostgreSQL │
                                    │  Pro          │  │  + Realtime │
                                    └──────────────┘  └─────────────┘
```

## Intent Classification

| Intent | Triggers | Example SMS |
|--------|----------|-------------|
| `ROUTE_QUERY` | "route", "from X to Y", route numbers | `"mat to kikuyu from odeon"` |
| `LIVE_REPORT` | "jam", "accident", "msongamano" | `"Heavy jam at Kangemi"` |
| `FARE_CHECK` | "fare", "bei", "how much" | `"Bei ya mat CBD to Karen?"` |
| `SAFETY_ALERT` | "dangerous", "robbery", "hatari" | `"Wizi at Eastleigh stage"` |
| `UNKNOWN` | Unclassifiable | `"Hello what is this?"` |

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Google Cloud project with Vertex AI API enabled
- Africa's Talking account (sandbox or production)
- Supabase project

### 2. Setup
```bash
# Clone and install
cd "GDG NAIROBI AGENTATHON 2026"
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API credentials

# Create database tables
# → Run sql/schema.sql in the Supabase SQL Editor

# Seed route data
npm run seed
```

### 3. Run
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Test
```bash
# Simulate SMS interactions
npm run simulate
```

### 5. Dashboard
Open `http://localhost:3000/dashboard` for the live monitoring UI.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sms/incoming` | Africa's Talking SMS webhook |
| `POST` | `/sms/delivery` | Delivery report callback |
| `GET` | `/api/reports` | Active live reports (JSON) |
| `POST` | `/api/simulate` | SMS simulation (dev only) |
| `GET` | `/health` | Health check |
| `GET` | `/dashboard` | Live monitoring UI |

## Project Structure

```
├── src/
│   ├── server.js              # Express server & endpoints
│   ├── config/
│   │   ├── index.js           # Environment configuration
│   │   └── system-prompt.js   # Gemini 2.5 Pro system prompt
│   ├── services/
│   │   ├── africastalking.js  # SMS send/receive
│   │   ├── vertex-ai.js       # Gemini API integration
│   │   └── supabase.js        # Database operations
│   └── agents/
│       └── route-agent.js     # Core orchestrator
├── dashboard/
│   └── index.html             # Live monitoring dashboard
├── scripts/
│   ├── seed-routes.js         # Database seeder (15 routes)
│   └── simulate-sms.js        # SMS test simulator
├── sql/
│   └── schema.sql             # Supabase database schema
└── .env.example               # Environment template
```

## License

MIT — GDG Nairobi Agentathon 2026
