# Xeno Mini 🚀

**AI-Powered Chat-First CRM** for consumer brands. Marketers interact with a conversational AI assistant to segment customers, personalize campaigns, execute broadcasts, and monitor real-time delivery metrics—eliminating complex forms and guesswork.

**Tech Stack:** React 19 · TypeScript · Vite · Express · Node.js · Google Gemini API · Firebase/Firestore · TailwindCSS

## Core Features

- **AI-Powered Segmentation:** Natural language queries translated to SQL-like rules via Google Gemini
- **Real-Time Campaign Dispatch:** Concurrent message delivery with webhook receipt tracking
- **Live Analytics Dashboard:** Polled stats panel showing delivery metrics and engagement funnels
- **Auto-Seeded Database:** 50 sample customers + 150 orders for instant testing (no manual setup)

## System Architecture

```
User Chat → React UI → Express API → Gemini AI (intent parsing)
                          ↓
                      Firestore DB ← Webhook callbacks (idempotent)
                          ↓
                    Campaign Dispatch → Live Stats (3s polling)
```

## Design Decisions for Scale

| Component | Current | Production Path |
|-----------|---------|------------------|
| **Query Execution** | In-memory filtering | PostgreSQL indexes / BigQuery partitions |
| **Campaign Dispatch** | Concurrent async/await | AMQP broker (RabbitMQ/SQS) + DLQ |
| **Webhook Idempotency** | Timestamp checks | Redis locks / DB constraints |
| **Multi-Tenancy** | Single tenant | Row-Level Security (RLS) + JWT roles |

## Quick Start

```bash
# Install & configure
npm install
cp .env.local.example .env.local  # Add your GEMINI_API_KEY

# Run (auto-seeds Firestore with 50 customers + 150 orders)
npm run dev
# → Open http://localhost:3000
```

**Available Scripts:**
- `npm run dev` — Start dev server
- `npm run build` — Build for production
- `npm run lint` — TypeScript verification
- `npm start` — Run production server

## 🔒 Security & Secrets

### Local Development
1. Copy config templates:
   ```bash
   cp firebase-applet-config.json.example firebase-applet-config.json
   cp .env.example .env.local
   ```
2. Fill in real credentials (never commit these files)

### GitHub Actions CI/CD
Set these secrets in **GitHub → Settings → Secrets and variables → Actions:**

| Secret | Source |
|--------|--------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `FIREBASE_CONFIG` | Firebase Console (as JSON string) |

See [SECURITY.md](SECURITY.md) for detailed instructions.
