# Xeno Mini 🚀 — AI-Powered Chat-First CRM

**Smart customer segmentation, personalized campaigns, and real-time dispatch** — all through conversational AI. Type natural language commands, get AI-powered audience segments and message templates instantly, launch campaigns in seconds.

**Built for:** Marketing teams who want to escape spreadsheets and form-filling. Designed for hiring portfolios that showcase production-ready thinking.

---

## 🎯 Problem & Solution

**Problem:** Marketing teams spend 40% of their time on manual segmentation, template drafting, and campaign setup instead of strategy.

**Solution:** Xeno Mini interprets natural language intent (e.g., "Send 25% off to customers inactive for 45 days") and automatically:
1. Parses customer segmentation rules
2. Generates personalized message templates
3. Selects optimal channels (WhatsApp/SMS/Email)
4. Executes multi-channel broadcasts
5. Tracks delivery & engagement in real-time

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Framer Motion |
| **Backend** | Express, Node.js v20+, esbuild |
| **AI Engine** | Google Gemini API (with intelligent local mock fallback) |
| **Database** | Firebase Firestore (+ local JSON fallback) |
| **CI/CD** | GitHub Actions (Node 20.x, 22.x) |
| **Deployment Ready** | Built for Cloud Run, Vercel, or self-hosted |

---

## ✨ Core Features

✅ **AI Intent Parsing** — Converts "Target Delhi beauty customers" → SQL segment rules

✅ **Smart Segmentation** — Lapsing, high-spender, location, category-based audiences auto-detected

✅ **Template Generation** — AI drafts personalized message templates with `{{name}}` placeholders

✅ **Multi-Channel Dispatch** — Routes to WhatsApp/SMS/Email based on segment characteristics

✅ **Live Dashboard** — Real-time campaign metrics, audience previews, delivery tracking

✅ **Auto-Seeded Demo Data** — 50 customers + 150 orders loaded on startup (zero manual setup)

✅ **Offline-First** — Works without Gemini API key using intelligent local mock

✅ **Production Patterns** — Error handling, idempotency, webhook receipt tracking

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React 19 UI                                            │
│  (Chat interface, campaign builder, live stats panel)  │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/JSON
                   ↓
┌──────────────────────────────────────────────────────────┐
│  Express API (Node.js)                                  │
│  • /api/chat — Intent parsing + campaign gen            │
│  • /api/send — Campaign dispatch orchestration          │
│  • /api/stats — Metrics & analytics                     │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
       ↓                          ↓
   ┌────────────────────┐  ┌──────────────────────┐
   │ Gemini AI (intent) │  │ Firestore DB         │
   │ + Mock Fallback    │  │ (or local JSON)      │
   └────────────────────┘  └──────────────────────┘
                                   ↑
                                   │ (webhook callbacks)
                           ┌───────────────┐
                           │ Campaign      │
                           │ Dispatch      │
                           │ Engine        │
                           └───────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.0.0+ (checked in CI)
- npm 10.0.0+
- (Optional) Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Local Development

```bash
# 1. Clone & install
git clone <repo-url>
cd xenoo
npm install

# 2. Configure (optional — works without API key)
cp .env.example .env.local
# Edit .env.local to add GEMINI_API_KEY if you have one

# 3. Run dev server (auto-seeds 50 customers + 150 orders)
npm run dev

# 4. Open http://localhost:3000 in browser
```

### Try These Commands

Once running, try asking the AI in the chat:

```
"Send a 25% discount to customers who haven't ordered in 45 days"
→ Creates WhatsApp campaign targeting lapsing customers

"Email our top spenders with total spend above 15000"
→ Generates VIP loyalty campaign with email channel

"SMS flash sale: 40% off all electronics"
→ Category-specific SMS broadcast with urgency messaging

"WhatsApp offer to customers in Delhi"
→ City-based local campaign targeting Delhi audience

"Show me campaign performance stats"
→ Displays live delivery metrics and engagement funnels
```

---

## 📦 Available Scripts

```bash
npm run dev       # Start dev server with hot reload (localhost:3000)
npm run build     # Production build (Vite + esbuild)
npm run lint      # TypeScript type checking
npm start         # Run production server
npm run clean     # Clear build artifacts
```

---

## 🔒 Security & Configuration

### Local Development Setup

```bash
# Copy config templates
cp firebase-applet-config.json.example firebase-applet-config.json
cp .env.example .env.local
```

Then edit `.env.local` with:
```env
GEMINI_API_KEY=AIza...          # From Google AI Studio (optional)
APP_URL=http://localhost:5173   # Vite dev server
```

**Important:** `.env.local` and `firebase-applet-config.json` are in `.gitignore` — never commit them.

### GitHub Actions Secrets

For CI/CD, configure these secrets in **Settings → Secrets and variables → Actions:**

| Secret Name | Where to Get | Used For |
|---|---|---|
| `GEMINI_API_KEY` | [Google AI Studio API Keys](https://aistudio.google.com/app/apikey) | AI intent parsing in workflows |
| `FIREBASE_CONFIG` | Firebase Console → Settings | Local testing with real DB |

**Example firebase config JSON structure:**
```json
{
  "projectId": "your-project",
  "apiKey": "AIza...",
  "appId": "1:12345:web:abc123",
  "authDomain": "your-project.firebaseapp.com",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "12345"
}
```

See [SECURITY.md](SECURITY.md) for complete secrets management guide.

---

## 📊 Design Decisions for Production Scale

| Aspect | Current | Scaling Path |
|--------|---------|---------------|
| **User Segmentation** | In-memory JS filtering | PostgreSQL + composite indexes |
| **Campaign Dispatch** | Sequential async/await | Message queue (RabbitMQ/AWS SQS) + retry DLQ |
| **Webhook Idempotency** | Timestamp-based dedup | Redis distributed locks + DB unique constraints |
| **Multi-Tenancy** | Single-tenant demo | Row-level security (RLS) + JWT org scoping |
| **Persistence** | Firebase + local JSON | PostgreSQL + Redis cache |
| **Analytics** | 3s polling | Kafka event stream → BigQuery |

---

## 🧪 Testing in CI/CD

GitHub Actions workflow runs on **Node 20.x and 22.x:**

✅ Installs dependencies  
✅ Prepares config files  
✅ TypeScript lint check  
✅ Full production build  
✅ Uploads dist artifacts  
✅ Reports summary to PR  

**View workflow:** [.github/workflows/ci.yml](.github/workflows/ci.yml)

---

## 💡 Key Implementation Highlights

**1. Hybrid AI (Real + Mock)**  
Tries Google Gemini API first; gracefully falls back to local intelligent mock when API unavailable.

**2. Idempotent Webhooks**  
Campaign delivery tracked with idempotency keys—safe to retry without duplicates.

**3. Auto-Seeding**  
On first startup, auto-generates realistic customer database (50 customers, 150 orders) so no manual setup needed.

**4. Type-Safe End-to-End**  
TypeScript strict mode from React components → Express → Database schemas.

**5. Production Thinking**  
Error boundaries, graceful degradation, offline support, status monitoring—all included.

---

## 📖 Additional Resources

- [SECURITY.md](SECURITY.md) — Detailed secrets management & security checklist
- [WALKTHROUGH_SCRIPT.md](WALKTHROUGH_SCRIPT.md) — 5-6 minute video narration script
- [server.ts](server.ts) — Express backend entry point
- [src/App.tsx](src/App.tsx) — React UI main component
- [src/lib/gemini.ts](src/lib/gemini.ts) — AI intent parsing with mock fallback
