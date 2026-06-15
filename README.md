# Xeno Mini 🚀

Xeno Mini is a full-stack, chat-first consumer CRM designed for consumer brands. Instead of filling out complex multi-tab segmentation forms and filters, marketers simply prompt the embedded AI assistant in plain English to automatically execute precise database segments, draft personalized templates, dispatch campaigns, and track real-time delivery funnels.

## Architecture & Telemetry Flow

```text
Marketer ──[Types Intent]──> Chat Panel (React App)
                                  │
                                  ▼
                            POST /api/chat
                                  │
                                  ▼
                         Express Backend (Node)
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      │ (Intent Analysis)                                     │ (Data Synchronization)
      ▼                                                       ▼
Google Gemini AI ───────────────────────────────> Cloud Firebase Database
(Translates prompt to SQL/Rules)                 (Customers, Campaigns, Stats)
                                                              │
                                                              ▼
                                                        POST /api/send
                                                              │
                                                              ▼
                                                    [Channel Dispatch Queue]
                                                              │
                                                              ▼
                                                    POST /channel/api/send
                                                    (Background Simulator)
                                                              │
                       ┌──────────────────────────────────────┘
                       │ (Webhook Delivery Receipt Callbacks)
                       ▼
               POST /api/receipt ───────────────────────────────────┐
               (Updates database campaign communications & stats)   │
                                                                    ▼
                                                             GET /api/stats
                                                             (Polled every 3s)
                                                                    │
                                                                    ▼
                                                            Live Stats Panel
```

## Production Tradeoffs & Scaling Ledger

1. **In-Memory Query Resolution:** Since the CRM features a responsive 50-customer regional client base, the segment clauses formulated by Gemini are computed safely inside the server. In production with millions of rows, we would execute this using custom PostgreSQL indexes, Elasticsearch, or partitioned BigQuery datasets.
2. **Synchronous Fetch Operations:** Channel dispatch is triggered concurrently in Express. At scale, this would be decoupled using an AMQP message broker (like RabbitMQ, Amazon SQS, or Kafka) combined with a dead-letter queue (DLQ) to ensure no communication ever drops during transmission surges.
3. **Webhook Callback Idempotency:** We implemented simple timestamp checking for callbacks to avoid double-processing. Under high-throughput production webhooks, we would utilize Redis-based lock managers or database unique constraints to guarantee absolute idempotency.
4. **Multi-Tenancy & Authorization:** This regional assignment operates as a master controller. For distribution, we would introduce secure Multi-Tenant schemas, role-based access tokens, and Row-Level Security (RLS) rules.

## Local Operations Setup

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Local Environment**
   Duplicate `.env.local.example` into a new `.env.local` file and add your custom `GEMINI_API_KEY` token from Google AI Studio.

3. **Database Telemetry Seed**
   The application auto-seeds your Firestore Cloud Database with exactly 50 customers and 150 orders on its very first start! No manual database scripting required!

4. **Boot Development Environment**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to start your chat CRM.
