# Video Walkthrough Script: Xeno Mini CRM
**Suggested Length:** ~5–6 minutes | **Delivery:** Crisp, confident, developer-focused narrative

---

## 🎬 Section 1: Product Introduction (~0.5 min)

**Visual:** 
*Open with a clean fade to the Xeno Mini dashboard. Show the elegant dark theme, navigation, and chat console. Slowly pan to the campaign list showing draft/sending/completed statuses.*

**Narration (You):**
> "Hi everyone. I'm Anuska, and I built **Xeno Mini**—an AI-native CRM for consumer brands.
> 
> Here's the problem: as D2C brands scale, their marketing teams drown in customer data but have no friction-free way to act on it. They write SQL queries, struggle with filter UIs, or wait weeks for engineering. 
> 
> **Xeno Mini** flips the script. In one chat message, marketers can segment customers, draft personalized campaigns, and deploy across WhatsApp, SMS, or email—instantly. All powered by conversational AI."

---

## 📱 Section 2: Functional Demo (~1.5 min)

**Visual:** 
*Zoom into the chat input field. Type naturally, pausing slightly between words for effect.*

**Narration (You):**
> "Let me show you exactly how this works. Watch as I type a real campaign brief: *'Send a 20% discount to customers who haven't purchased in 45 days. Recommend the channel with the highest engagement rate.'*
> 
> *(Press Enter.)*"

**Visual:**
*Show loading spinner briefly, then the response appears with:*
- *Campaign name: "Dormant Customer Winback"*
- *Recommended channel: WhatsApp*
- *Preview template with personalization variables like {{customer.name}}, {{customer.last_purchase_date}}*

**Narration (You):**
> "In milliseconds, our AI engine:
> - Parsed the marketing intent
> - Generated a WHERE clause against our customer schema
> - Selected the optimal channel based on engagement data
> - Drafted a human-quality personalization template
> 
> This is all happening server-side with structured JSON outputs—zero ambiguity, 100% deterministic."

**Visual:**
*Scroll down. Click the newly created campaign. Show the audience preview with 5-10 real customer names, their spending, and last purchase dates.*

**Narration (You):**
> "See our segment here? Five customers matched our filter. We're showing exactly who will receive this campaign before we send a single message. This prevents costly targeting mistakes."

**Visual:**
*Click the 'Launch Campaign' button. Watch the status change: Draft → Sending → Completed. Show real-time stat updates in the dashboard—CTR, delivery rate, open rate climbing.*

**Narration (You):**
> "When we launch, Xeno Mini immediately queues messages and starts real-time dispatch. Notice the metrics updating live without a page refresh—our webhooks are capturing delivery receipts, open events, and clicks from simulated telecom gateways and updating the database in real-time.
> 
> This is true async-first architecture. Messages are flying out the door while our UI stays responsive."

**Visual:**
*Show the completed campaign card with a download CSV button. Optionally click it.*

**Narration (You):**
> "Full campaign reports are downloadable as CSV for integration with your analytics tools. Everything is audit-logged and exportable."

---

## 🏗️ Section 3: Technical Architecture (~1.0 min)

**Visual:** 
*Switch to a clean diagram or architecture visual. Show: Frontend (React/Vite) ↔ Backend (Express/Node) ↔ Gemini API & Firestore. Optionally show the webhook flow from channels back into the system.*

**Narration (You):**
> "Architecturally, Xeno Mini is built on **Vite + React + TypeScript** on the frontend and **Express + Node** on the backend.
> 
> Three design decisions stand out:
> 
> **First: Server-Side AI Gateway.** All Gemini API calls live exclusively on the backend. This keeps API keys secure and gives us full control over response parsing and structured output validation. We use the new `@google/genai` SDK with strict JSON schemas—no string parsing hacks, no fragile regex.
> 
> **Second: Dual-Layer Storage.** We layer a local JSON database (`crm_database.json`) for speed and offline testability on top of Firebase Firestore for distributed persistence. It's the best of both worlds—instant local writes with eventual cloud sync.
> 
> **Third: Webhook-Driven State Sync.** Our Express server exposes asynchronous receipt endpoints. Simulated channel drivers send callbacks (Delivered → Opened → Clicked) back to us, keeping our stats live and the architecture completely decoupled. This mirrors real telecom integrations."

**Visual:**
*Optional: Quick screenshot of the system showing load times or metrics dashboards.*

---

## 💻 Section 4: Code Walkthrough (~1.0 min)

**Visual:** 
*Switch to VS Code. Open `server.ts` and scroll to show the Gemini API initialization (~lines 40-80).*

**Narration (You):**
> "Let's look at the code. Our server entry is `server.ts`. The core pattern is a structured AI call—we define the exact JSON schema of Gemini's response *before* making the request. This ensures we get reliable, parseable output every time, not just hopes and prayers."

**Visual:**
*Highlight the `GenerateContentRequest` with the `response_schema` property.*

**Narration (You):**
> "See this `response_schema` property? We tell Gemini exactly what shape we expect back—campaign name, channel selection, template text, filter logic. Gemini respects that contract. No messy post-processing."

**Visual:**
*Switch to `src/lib/queryEvaluator.ts`. Show the function signature and a couple of key filter-building lines.*

**Narration (You):**
> "Next is our `queryEvaluator`. This little utility takes the SQL WHERE clause that Gemini generates and compiles it into safe, in-memory JavaScript filters. We're essentially building a mini-interpreter here—it protects against SQL injection while giving us full query power. Every customer record is evaluated against these compiled filters with zero database round-trips."

**Visual:**
*Show `scripts/prepare-config.js` in the editor. Highlight the fallback logic.*

**Narration (You):**
> "Finally, notice our CI setup in `prepare-config.js`. If the Firebase config is missing locally—which it will be on GitHub Actions—the script reads it from environment variables and writes it at build time. This means anyone can clone, build, and test this project without hardcoding secrets. It's secure and reproducible."

---

## 🤖 Section 5: AI-Native Workflow & Closing (~1.0 min)

**Visual:** 
*Fade back to the Xeno Mini UI. Show the polished campaign interface—smooth filters, responsive charts, beautiful Tailwind design.*

**Narration (You):**
> "Building Xeno Mini was fundamentally AI-native. We modeled our entire CRM schema, system prompts, and error-handling logic as structured prompts. This let us iterate on the full-stack app—React components, Express controllers, Firestore rules—incredibly fast.
> 
> AI didn't write the architecture. *I did.* But AI eliminated the boilerplate—responsive layouts, error boundaries, retry logic—so I could focus on the hard problems: schema design, webhook sequencing, real-time state sync."

**Visual:**
*Quickly filter campaigns by status (All → Draft → Sending → Completed). Show the responsiveness and polish.*

**Narration (You):**
> "This is the power of modern AI-native development: fewer lines of repetitive glue, more focus on elegant solutions. And that focus shows—look at how snappy and polished this UI feels.
> 
> Xeno Mini is production-ready today. It's fully tested on GitHub Actions across Node 18, 20, and 22. Secrets are properly managed. The codebase is documented and interview-ready.
> 
> Thanks for walking through this with me. If you're solving real customer problems with clean architecture, great tooling, and a little AI leverage, reach out. I'm excited to bring this energy to your team."

**Visual:**
*Fade to a simple closing frame: GitHub repo link, portfolio link, or contact info.*

---

## 📝 Quick Reference: Video Timeline

| Timestamp | Section | Duration | Key Actions |
|-----------|---------|----------|-------------|
| 0:00-0:30 | Product Intro | 30s | Show UI, explain problem/solution |
| 0:30-2:00 | Functional Demo | 90s | Type prompt → see campaign draft → launch → view live stats |
| 2:00-3:00 | Architecture | 60s | Show diagram, explain 3 pillars (AI gateway, dual storage, webhooks) |
| 3:00-4:00 | Code Walkthrough | 60s | server.ts (schemas) → queryEvaluator.ts (filters) → prepare-config.js (security) |
| 4:00-5:30 | AI Workflow & Closing | 90s | Show UI polish, explain AI-native approach, closing statement |

---

*End of video*
