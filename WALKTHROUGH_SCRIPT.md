# Video Walkthrough Script: Xeno Mini CRM
**Suggested Length:** ~5–6 minutes
**Vibe:** Professional, enthusiastic, crisp, and developer-oriented.

---

## 🎬 Section 1: Product Introduction (~0.5 min)

**Visual:** 
*Show the main UI of Xeno Mini landing page with its elegant dark theme, "all/draft/sending/completed" filter indicators, and the chat console.*

**Narration (You):**
> "Hi everyone! Welcome to Xeno Mini. 
> 
> As direct-to-consumer brands grow, retail marketing teams face a unique bottleneck: they have massive amounts of customer transaction data but lack a simple, friction-free way to segment that data and immediately launch targeted, multichannel campaigns. They often have to write complex SQL, drag-and-drop cumbersome filter boxes, or wait for engineering teams.
> 
> We built **Xeno Mini** to solve this. It's an AI-native CRM and campaign engine designed for retail marketers. Marketers can describe their customer targeting goals in conversational language, and Xeno Mini instantly constructs dynamic segments, drafts highly humanized personalization templates, and deploys real-time multichannel engagements over WhatsApp, SMS, or Email."

---

## 📱 Section 2: Functional Demo (~1.5 min)

**Visual:** 
*Action 1: Type in the chat input: `"Send a 20% discount coupon to customers who haven't ordered in the last 45 days. Recommend WhatsApp."` and hit Enter.*

**Narration (You):**
> "Let's see it in action. I'm going to type a natural language campaign intent: *'Send a 20% coupon discount to customers who haven't ordered in the last 45 days, recommending WhatsApp.'*
> 
> Watch as our AI engine parses this live in the background. It identifies this as a `campaign` intent, analyzes our retail schema, and writes a precise SQL-compatible WHERE clause to slice through customer orders and sign-ups.
> 
> It dynamically drafted a campaign called **'Dormant Customer Winback'**, chose **WhatsApp** on marketing merit because WhatsApp yields higher conversational action rates, and crafted a beautiful personalization template using dynamic client variables."

**Visual:**
*Action 2: Scroll down to the campaigns list to show the new draft campaign. Show the real-time preview of the audience list (e.g., 5 customer names with their total spent).*

**Narration (You):**
> "Look below—our campaign list immediately registered this campaign draft. We can see our target audience segment size before deploying any messages. We also have a live list preview showing exactly which customers match our filters. 
> 
> Let's hit the **Launch Campaign** button."

**Visual:**
*Action 3: Click "Launch". Show the campaign status shift from `Draft` to `Sending` and then to `Completed` with simulated progress. Watch the real-time donut charts and horizontal bar metrics update instantly (Total Queued, Delivered, Opened, Clicked).*

**Narration (You):**
> "When we launch, Xeno Mini queues communication transactions and starts dispatching them asynchronously. Under the hood, lifecycle callback webhooks are receiving delivery confirmation, open rates, and click track receipts. 
> 
> The stats charts update in real-time, displaying active delivery logs, CTR metrics, and operational performance without refreshing the browser! If any message delivery fails, we can hit a single-click **'Retry Failed'** button to safely re-queue them."

**Visual:**
*Action 4: Click 'Download CSV' on the completed card to trigger an instantaneous download of the full raw reports.*

---

## 🏗️ Section 3: Technical Architecture (~1.0 min)

**Visual:** 
*Open an architecture summary or view the `/server.ts` imports. You can also sketch or show a quick summary slide of the backend design.*

**Narration (You):**
> "Now let's dive into the technical architecture. Xeno Mini runs on a modern, full-stack **Vite + React + Express** architecture.
> 
> There are three major architectural pillars in our system:
> 
> 1. **Server-Side AI Hub**: All interaction with the Gemini API is kept strictly server-side inside our Express container. This secures our `GEMINI_API_KEY` entirely from client-side network inspectors.
> 
> 2. **Double-Layer Storage Strategy**: To ensure speed, simplicity, and bulletproof offline/CI testing, we implemented a dual local-and-cloud data layer. It reads and writes from an optimized, schema-validated JSON database model (`crm_database.json`) on disk, while utilizing Firebase's Firestore engine configuration for persistent distributed authentication and telemetry logging.
> 
> 3. **Real-time Lifecycle Webhooks**: To simulate real-world telecom gateways, our Express server exposes standard asynchronous receipt endpoints. Channel drivers spawn callbacks, sending status receipts (Delivered ➔ Opened ➔ Clicked) back to Xeno Mini's API, keeping our tables synchronized and completely decoupled."

---

## 💻 Section 4: Code Walkthrough (~1.0 min)

**Visual:** 
*Switch to your code editor. Show `server.ts` specifically around the Gemini API model selection, system instruction (lines 80-130), and highlight the JSON schema output configuration.*

**Narration (You):**
> "Let's walk through the codebase. The server entry is `server.ts`. 
> 
> A critical highlight is our structured schema generation. We leverage the modern `@google/genai` TypeScript SDK and specify the exact JSON schema of the return block to ensure that Gemini replies with strict JSON metadata. This eliminates string-cleaning boilerplates and ensures 100% reliable system actions.
> 
> Let's look at `src/lib/queryEvaluator.ts`."

**Visual:**
*Briefly open `src/lib/queryEvaluator.ts` on screen.*

**Narration (You):**
> "This utility acts as our on-the-fly execution engine. It parses the SQL WHERE statements generated by Gemini and compiles them into safe in-memory filters over our array objects, guarding against remote SQL injections while preserving full-featured query capabilities.
> 
> Finally, we have made the repository completely **GitHub Actions Friendly**. We added a dynamic preprocessing step in `package.json` at `scripts/prepare-config.js`. If you clone the repository on any CI environment without checking in private system credentials, it automatically handles placeholder configurations, allowing build verification to pass with zero setup."

---

## 🤖 Section 5: AI-Native Workflow (~1.0 min)

**Visual:** 
*Switch back to the beautiful UI, filter through different statuses (All, Draft, Sending, Completed) to show off how polished and responsive the interface feels.*

**Narration (You):**
> "Building Xeno Mini was a truly AI-native experience. By modeling our CRM schemas and system requirements as structured prompts, we were able to write and refactor the entire full-stack application in a fraction of the time.
> 
> We used AI to auto-generate high-fidelity responsive Tailwind interfaces, model exact Firestore security rules matching zero-trust guidelines, and establish dynamic simulated backoff behaviors for telecommunication callbacks. It really shows how developers can shift focus from writing repetitive controller queries to designing amazing consumer experiences.
> 
> Thank you for watching this walkthrough of Xeno Mini! Get ready to revolutionize how your brand communicates."

---
*End of video*
