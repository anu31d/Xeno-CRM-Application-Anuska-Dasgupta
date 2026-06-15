import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { doc, getDocs, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, where, db } from "./src/lib/localFirestore.js";
import { ai, GEMINI_MODEL } from "./src/lib/gemini.js";
import { runDatabaseSeeder } from "./src/lib/seed.js";
import { filterCustomersBySql } from "./src/lib/queryEvaluator.js";
import { Customer, Order } from "./src/lib/seedData.js";

// Helper for generating custom IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Exponential/Linear backoff helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Run database seeder on boot (non-blocking background task)
  runDatabaseSeeder().catch(err => {
    console.error("Background seeding failed:", err);
  });

  // ==========================================
  // API ROUTES (API FIRST)
  // ==========================================

  // Test Endpoint to evaluate firestore permissions
  app.get("/api/test-db", async (req, res) => {
    const results: any = {};
    try {
      results.step1 = "Fetching chat_messages collection...";
      const chatMessagesRef = collection(db, "chat_messages");
      const snap = await getDocs(chatMessagesRef);
      results.step1_success = true;
      results.step1_size = snap.size;
    } catch (err: any) {
      results.step1_success = false;
      results.step1_error = err.toString();
      results.step1_stack = err.stack;
    }

    try {
      results.step2 = "Writing test message to chat_messages...";
      const testDocRef = doc(collection(db, "chat_messages"), "test_express_id");
      await setDoc(testDocRef, { role: "assistant", content: "Express Test Message", created_at: new Date().toISOString() });
      results.step2_success = true;
    } catch (err: any) {
      results.step2_success = false;
      results.step2_error = err.toString();
      results.step2_stack = err.stack;
    }

    res.json(results);
  });

  // 1. POST /api/chat: Gemini Intent Parsing -> Segment -> Queue Campaign
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log(`Received user message: "${message}"`);

      // Load last 10 chat messages for conversation state context
      const chatMessagesRef = collection(db, "chat_messages");
      const chatQuery = query(chatMessagesRef, orderBy("created_at", "asc"), limit(10));
      const chatSnapshot = await getDocs(chatQuery);
      
      const historyContext = chatSnapshot.docs.map(doc => {
        const data = doc.data();
        return `${data.role === "user" ? "Marketer" : "Assistant"}: ${data.content}`;
      }).join("\n");

      // Verbatim prompt from user spec
      const systemInstruction = `You are an AI assistant embedded in Xeno Mini, a CRM for consumer brands.
You help marketers run campaigns by understanding their intent and translating it into actions.

The database has these tables:
- customers(id, name, email, phone, city, total_orders, total_spent, last_purchase_date, tags)
- orders(id, customer_id, amount, product_category, product_name, created_at)
- campaigns(id, name, channel, status, audience_size, created_at)
- campaign_stats(campaign_id, total_sent, delivered, failed, opened, clicked)

When the marketer describes a campaign intent, respond with ONLY a JSON object (no markdown, no explanation outside the JSON) in this exact shape:
{
  "intent": "campaign" | "stats_query" | "general",
  "campaign_name": "string",
  "goal": "string — one sentence describing campaign goal",
  "segment_description": "string — human readable segment description",
  "segment_sql": "string — a valid Postgres WHERE clause on the customers table. You may use subqueries referencing the orders table. Example: total_spent > 2000 AND last_purchase_date < NOW() - INTERVAL '45 days'",
  "channel": "whatsapp" | "sms" | "email",
  "message_template": "string — personalized message using {{name}} for customer name. Keep under 160 chars for SMS, can be longer for email/whatsapp. Sound human, not robotic.",
  "ai_reply": "string — your conversational reply to the marketer explaining what you understood, what you're going to do, and your core marketer reasoning. Mention segment logic, audience size rationale, and channel selection logic (e.g., recommend WhatsApp because it has 40% higher open rates on mobile or SMS for instant discount alerts). Always write in professional, friendly marketing reasoning without boilerplate.",
  "stats_query_sql": "string or null — if intent is stats_query, a SELECT query against campaigns and campaign_stats to answer the question",
  "segment_rule_json": { "filters": [ { "field": "string", "operator": "string", "value": "any" } ] }
}

Rules:
- DO NOT use markdown bold tags or double asterisks (**) anywhere in your text fields (like ai_reply, goal, message_template, campaign_name), as it displays as literal double asterisks. Always use plain text.
- segment_sql must be safe — only SELECT-compatible WHERE clauses, no DROP/DELETE/UPDATE
- For lapsing customers use: last_purchase_date < NOW() - INTERVAL 'X days'
- For high spenders use: total_spent > X
- For category buyers use: id IN (SELECT customer_id FROM orders WHERE product_category = 'X')
- For city targeting use: city = 'X'
- channel: select intelligently based on message type (WhatsApp/SMS/Email) on marketing merit. Recommend WhatsApp for casual, conversation-heavy or highly-personal beauty/fashion coupon offers, SMS for urgent, instant coupon alert, and Email for rich promotional arrivals. Mention your reasoning explicitly in ai_reply.
- If intent is stats_query, fill stats_query_sql and set other campaign fields to null
- If intent is general (greeting, question), just fill ai_reply and set everything else to null`;

      // Prompt combined with chat history
      const prompt = `Conversation History Context:\n${historyContext}\n\nLatest Marketer Prompt: "${message}"`;

      // Invoke Gemini API using modern GoogleGenAI specifications
      const geminiResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      // Get text response - works with both real API and mock
      const rawText = geminiResponse.text;
      const text = typeof rawText === 'function' ? rawText() : rawText;
      if (!text) {
        throw new Error("No response content received from Gemini model.");
      }

      console.log("Raw Gemini JSON response:", text);
      const parsed = JSON.parse(text);

      const intent = parsed.intent || "general";
      const aiReply = parsed.ai_reply || "Hello! I can help you draft campaigns or analyze segmented CRM contacts.";

      // 1. Log user message to Firestore
      const userMsgId = generateId();
      await setDoc(doc(db, "chat_messages", userMsgId), {
        id: userMsgId,
        role: "user",
        content: message,
        created_at: new Date().toISOString()
      });

      // Handle intents
      if (intent === "campaign") {
        const campaignName = parsed.campaign_name || `Campaign-${new Date().toLocaleDateString()}`;
        const segmentSql = parsed.segment_sql || "";
        const channel = parsed.channel || "whatsapp";
        const template = parsed.message_template || "Hello {{name}}!";

        // Fetch customers & orders to filter
        const customersSnapshot = await getDocs(collection(db, "customers"));
        const ordersSnapshot = await getDocs(collection(db, "orders"));

        const customersList = customersSnapshot.docs.map(d => d.data() as Customer);
        const ordersList = ordersSnapshot.docs.map(d => d.data() as Order);

        // Compute segmentation list
        const filteredCustomers = filterCustomersBySql(customersList, ordersList, segmentSql);
        const count = filteredCustomers.length;

        // Smart segment size warning - prevent empty draft campaigns and suggest alternatives
        if (count === 0) {
          const alternativeAdvice = `I formulated your campaign intent into segment filter criteria, but it returned 0 customers from our database. Would you like me to loosen the guidelines? For example, if we were filtering for customers inactive over 45 days, we can try 30 days instead, or reduce the total spending requirement. This ensures we can get some active contacts!`;
          
          const assistantMsgId = generateId();
          await setDoc(doc(db, "chat_messages", assistantMsgId), {
            id: assistantMsgId,
            role: "assistant",
            content: alternativeAdvice,
            created_at: new Date().toISOString()
          });

          return res.json({
            ai_reply: alternativeAdvice,
            campaign_id: null,
            audience_count: 0,
            audience_preview: [],
            intent
          });
        }

        // Generate Campaign Record
        const campaignId = `camp-${generateId()}`;
        const campaignData = {
          id: campaignId,
          name: campaignName,
          goal: parsed.goal || "Engage targeted user base",
          segment_description: parsed.segment_description || "Targeted criteria matching customers",
          segment_rule_json: parsed.segment_rule_json || {},
          segment_sql: segmentSql,
          channel,
          message_template: template,
          status: "draft",
          audience_size: count,
          created_by_prompt: message,
          created_at: new Date().toISOString()
        };

        await setDoc(doc(db, "campaigns", campaignId), campaignData);

        // Queue Communications Records in Firestore
        for (const cust of filteredCustomers) {
          const commId = `comm-${generateId()}`;
          const personalizedMessage = template.replace(/\{\{\s*name\s*\}\}/g, cust.name);

          await setDoc(doc(db, "communications", commId), {
            id: commId,
            campaign_id: campaignId,
            customer_id: cust.id,
            customer_name: cust.name,
            name: cust.name, // compatibility
            phone: cust.phone,
            email: cust.email,
            message: personalizedMessage,
            channel,
            status: "queued",
            created_at: new Date().toISOString()
          });
        }

        // Initialize Stats Record inside campaign_stats
        const statsData = {
          campaign_id: campaignId,
          total_queued: count,
          total_sent: 0,
          delivered: 0,
          failed: 0,
          opened: 0,
          clicked: 0,
          last_updated: new Date().toISOString()
        };
        await setDoc(doc(db, "campaign_stats", campaignId), statsData);

        // 2. Log assistant reply with metadata inside chat_messages
        const assistantMsgId = generateId();
        await setDoc(doc(db, "chat_messages", assistantMsgId), {
          id: assistantMsgId,
          role: "assistant",
          content: aiReply,
          metadata: {
            campaign_id: campaignId,
            campaign_name: campaignName,
            segment_description: parsed.segment_description || "Targeted criteria matching customers",
            audience_count: count,
            audience_preview: filteredCustomers.slice(0, 5).map(c => ({ id: c.id, name: c.name, city: c.city, total_spent: c.total_spent })),
            channel,
            message_template: template,
          },
          created_at: new Date().toISOString()
        });

        return res.json({
          ai_reply: aiReply,
          campaign_id: campaignId,
          campaign_name: campaignName,
          segment_description: parsed.segment_description || "Targeted criteria matching customers",
          audience_count: count,
          audience_preview: filteredCustomers.slice(0, 5),
          channel,
          message_template: template,
          intent
        });

      } else if (intent === "stats_query") {
        // Execute dynamic stats analysis to report metrics live
        const campaignSnapshot = await getDocs(collection(db, "campaigns"));
        const statsSnapshot = await getDocs(collection(db, "campaign_stats"));

        const camps = campaignSnapshot.docs.map(d => d.data());
        const stats = statsSnapshot.docs.map(d => d.data());

        // Parse campaigns data into a dense list for the second model call
        const parsedCampaignStatsSummary = camps.map(c => {
          const s = stats.find(stat => stat.campaign_id === c.id) || {};
          return {
            campaign_name: c.name,
            channel: c.channel,
            status: c.status,
            audience_size: c.audience_size,
            sent: s.total_sent || 0,
            delivered: s.delivered || 0,
            opened: s.opened || 0,
            clicked: s.clicked || 0,
            failed: s.failed || 0,
            created_at: c.created_at
          };
        });

        // Dynamic stats analysis prompt to summarize telemetry data conversationally
        const queryAnalysisPrompt = `The marketer asked: "${message}"

Here is the exact live campaign and communication logs data from our CRM system:
${JSON.stringify(parsedCampaignStatsSummary, null, 2)}

Provide a friendly, highly professional, conversational analysis explaining exactly what the stats show. Answer their question directly.
Rules:
- Calculate metrics like open rate (opened/delivered) or click rate (clicked/opened) or delivery rate (delivered/sent) when applicable.
- Call out if there were failures (e.g. "We noted 3 failed deliveries due to service dropouts").
- Write like a professional retail marketing consultant who knows segment conversion.
- Do NOT use double asterisks (**) or markdown bold text. Keep descriptions as clean formatting.`;

        const statsAnalysisResult = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: queryAnalysisPrompt,
          config: {
            systemInstruction: "You are an expert CRM database analyst at Xeno Mini. Translate complex campaign telemetry stats into simple, insightful, and strategic summaries for retail marketers. Do NOT use double asterisks (**) or markdown bold text.",
            temperature: 0.1
          }
        });

        const statsReplyText = statsAnalysisResult.text || aiReply;

        // Create Chat assistant response
        const assistantMsgId = generateId();
        await setDoc(doc(db, "chat_messages", assistantMsgId), {
          id: assistantMsgId,
          role: "assistant",
          content: statsReplyText,
          created_at: new Date().toISOString()
        });

        return res.json({
          ai_reply: statsReplyText,
          intent
        });

      } else {
        // General query or friendly greeting
        const assistantMsgId = generateId();
        await setDoc(doc(db, "chat_messages", assistantMsgId), {
          id: assistantMsgId,
          role: "assistant",
          content: aiReply,
          created_at: new Date().toISOString()
        });

        return res.json({
          ai_reply: aiReply,
          intent
        });
      }

    } catch (e: any) {
      console.error("Error in POST /api/chat: ", e);
      try {
        const fs = await import("fs");
        fs.writeFileSync("error_trace.log", (e?.stack || String(e)) + "\n");
      } catch (logErr) {}
      return res.status(500).json({
        error: "Unrecognized intent or JSON translation failure.",
        ai_reply: "I had a minor hiccup querying the CRM. Try asking again with explicit criteria, like: 'Target loyal customers with total spent above 15000'."
      });
    }
  });

  // 2. POST /api/send: Dequeue and call channels
  app.post("/api/send", async (req, res) => {
    try {
      const { campaign_id, custom_template } = req.body;
      if (!campaign_id) {
        return res.status(400).json({ error: "campaign_id is required" });
      }

      console.log(`Starting execution for campaign ID: ${campaign_id}`);

      // Update Campaign Status to 'sending'
      const campaignDocRef = doc(db, "campaigns", campaign_id);
      await updateDoc(campaignDocRef, { status: "sending" });

      // Fetch queued communications
      const commsRef = collection(db, "communications");
      const queuedQuery = query(commsRef, where("campaign_id", "==", campaign_id), where("status", "==", "queued"));
      const queuedSnapshot = await getDocs(queuedQuery);

      if (queuedSnapshot.empty) {
        console.log(`No queued communications found for campaign ${campaign_id}`);
        await updateDoc(campaignDocRef, { status: "completed" });
        return res.json({ sent_count: 0 });
      }

      // If marketer edited message template before launching, updatequeued data
      if (custom_template) {
        await updateDoc(campaignDocRef, { message_template: custom_template });
        const updatePromises = queuedSnapshot.docs.map(async (docSnap) => {
          const commData = docSnap.data();
          const recipientName = commData.customer_name || commData.name || "Customer";
          const resMessage = custom_template.replace(/\{\{\s*name\s*\}\}/g, recipientName);
          await updateDoc(doc(db, "communications", docSnap.id), { message: resMessage });
          commData.message = resMessage; // update in-memory reference to send edited message
        });
        await Promise.all(updatePromises);
      }

      const scheduledJobs = queuedSnapshot.docs.map(async (docSnap) => {
        const commData = docSnap.data();
        const commId = commData.id;

        // Call the channel service stub endpoint asynchronously
        // We will make an HTTP call to our local channel webhook handler
        try {
          const payload = {
            communication_id: commId,
            recipient_name: commData.name || "Customer",
            recipient_phone: commData.phone || "+919876543210",
            recipient_email: commData.email || "customer@example.com",
            message: commData.message,
            channel: commData.channel
          };

          // Background endpoint call
          fetch(`http://127.0.0.1:${PORT}/channel/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(err => console.error("Async channel dispatch error:", err));

          // Set state to sent inside database
          await updateDoc(doc(db, "communications", commId), {
            status: "sent",
            sent_at: new Date().toISOString()
          });

          return { success: true, id: commId };
        } catch (error) {
          console.error(`Dispatch failed for comm ${commId}:`, error);
          return { success: false, id: commId };
        }
      });

      const results = await Promise.allSettled(scheduledJobs);
      const successfulCount = results.filter(r => r.status === "fulfilled").length;

      // Update Campaign Stats
      const statsRef = doc(db, "campaign_stats", campaign_id);
      await updateDoc(statsRef, {
        total_sent: successfulCount,
        last_updated: new Date().toISOString()
      });

      await updateDoc(campaignDocRef, { status: "completed" });

      console.log(`Successfully running dispatch for ${successfulCount} records`);
      return res.json({ sent_count: successfulCount });

    } catch (e) {
      console.error("Error in POST /api/send:", e);
      return res.status(500).json({ error: "Failed to queue dispatch items." });
    }
  });

  // 3. POST /channel/api/send: Stubbed channel service with lifecycle callback simulations
  app.post("/channel/api/send", async (req, res) => {
    const { communication_id, recipient_name, message, channel } = req.body;
    
    // Immediately return accepted as per specification (no blocking)
    res.json({ status: "accepted" });

    // Background asynchronous callbacks with Math.random rates
    const runSimulatedLifecycle = async () => {
      // 1. Delivery step: 1 to 3 seconds wait
      await delay(1000 + Math.random() * 2000);

      const isDelivered = Math.random() < 0.85; // 85% success, 15% failure
      const deliveryStatus = isDelivered ? "delivered" : "failed";

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`;

      // POST receipt to local receiver webhook
      const postReceipt = async (status: string) => {
        try {
          await fetch(`${appUrl}/api/receipt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              communication_id,
              status,
              timestamp: new Date().toISOString()
            })
          });
        } catch (err) {
          console.error("Failed to post simulation callback receipt:", err);
        }
      };

      await postReceipt(deliveryStatus);

      if (!isDelivered) return; // Terminate if transmission failed

      // 2. Open step: 3 to 8 seconds wait (60% open rate)
      await delay(3000 + Math.random() * 5000);
      const isOpened = Math.random() < 0.60;
      if (!isOpened) return;

      await postReceipt("opened");

      // 3. Click step: 5 to 15 seconds wait (25% click rate)
      await delay(5000 + Math.random() * 10000);
      const isClicked = Math.random() < 0.25;
      if (!isClicked) return;

      await postReceipt("clicked");
    };

    // Spawn non-blocking background queue callback chain
    runSimulatedLifecycle().catch(err => console.error("Background message lifecycle simulation collapsed:", err));
  });

  // 4. POST /api/receipt: Simulated Callback Reception Hook
  app.post("/api/receipt", async (req, res) => {
    let { communication_id, status, timestamp } = req.body;
    if (!communication_id || !status) {
      return res.status(400).json({ error: "Missing required callback metadata." });
    }

    console.log(`Webhook callback received: Communication ${communication_id} -> status: ${status}`);

    // Safe DB retry cycle logic (up to 3 times with 1 sec delay on failure)
    let retries = 3;
    let completed = false;
    let skipped = false;

    while (retries > 0 && !completed) {
      try {
        const commRef = doc(db, "communications", communication_id);
        const commSnap = await getDoc(commRef);

        if (!commSnap.exists()) {
          console.warn(`No communication record matches ${communication_id}`);
          break;
        }

        const data = commSnap.data();
        const timestampField = `${status}_at`;

        // Idempotency validation
        if (data[timestampField]) {
          skipped = true;
          completed = true;
          break;
        }

        // Perform updates inside communications record
        const updatePayload: Record<string, any> = {
          status,
          [timestampField]: timestamp || new Date().toISOString()
        };
        await updateDoc(commRef, updatePayload);

        // Aggragate stats to keep campaign_stats table exactly in-sync
        const campaignId = data.campaign_id;
        const commsCollectionRef = collection(db, "communications");
        const allCommsSnapshot = await getDocs(query(commsCollectionRef, where("campaign_id", "==", campaignId)));

        let totalQueued = allCommsSnapshot.size;
        let totalSent = 0;
        let delivered = 0;
        let failed = 0;
        let opened = 0;
        let clicked = 0;

        allCommsSnapshot.forEach(docNode => {
          const c = docNode.data();
          if (c.sent_at) totalSent++;
          if (c.status === "delivered") delivered++;
          if (c.status === "failed") failed++;
          if (c.status === "opened") opened++;
          if (c.status === "clicked") clicked++;
          // High levels rollups
          if (c.opened_at) opened++;
          if (c.clicked_at) clicked++;
          if (c.delivered_at) delivered++;
          if (c.failed_at) failed++;
        });

        // Dedup count errors
        // Standard counts
        const dedupOpened = Math.min(opened, totalSent);
        const dedupClicked = Math.min(clicked, dedupOpened);
        const dedupDelivered = Math.min(delivered, totalSent);

        const statsRef = doc(db, "campaign_stats", campaignId);
        await setDoc(statsRef, {
          campaign_id: campaignId,
          total_queued: totalQueued,
          total_sent: totalSent,
          delivered: dedupDelivered,
          failed: failed,
          opened: dedupOpened,
          clicked: dedupClicked,
          last_updated: new Date().toISOString()
        }, { merge: true });

        completed = true;
      } catch (err) {
        retries--;
        console.error(`Retry cycle failed. Active retries left: ${retries}`, err);
        if (retries === 0) {
          return res.status(500).json({ error: "Failed to persist receipt callbacks." });
        }
        await delay(1000);
      }
    }

    return res.json({ ok: true, skipped });
  });

  // 5. GET /api/stats: Return stats for UI dashboard updates
  app.get("/api/stats", async (req, res) => {
    try {
      const campaignIdQuery = req.query.campaign_id as string;

      const campaignsRef = collection(db, "campaigns");
      let campaignQuery = query(campaignsRef, orderBy("created_at", "desc"), limit(5));
      
      const campaignSnap = await getDocs(campaignQuery);
      const campaignList = campaignSnap.docs.map(docNode => docNode.data());

      // Fetch campaign stats to join in
      const finalCampaigns = await Promise.all(campaignList.map(async (c) => {
        const statsSnap = await getDoc(doc(db, "campaign_stats", c.id));
        const defaultStats = {
          total_queued: 0,
          total_sent: 0,
          delivered: 0,
          failed: 0,
          opened: 0,
          clicked: 0
        };
        const stats = statsSnap.exists() ? statsSnap.data() : defaultStats;

        // Clean values for returned JSON signature
        return {
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          created_at: c.created_at,
          segment_description: c.segment_description || "Targeted segment",
          stats: {
            total_queued: stats.total_queued || 0,
            total_sent: stats.total_sent || 0,
            delivered: stats.delivered || 0,
            failed: stats.failed || 0,
            opened: stats.opened || 0,
            clicked: stats.clicked || 0
          }
        };
      }));

      return res.json({ campaigns: finalCampaigns });
    } catch (e) {
      console.error("Error in GET /api/stats: ", e);
      return res.status(500).json({ error: "Failed to pull live campaign statistics." });
    }
  });

  // 6. GET /api/messages: Expose chat history to load initial client lists
  app.get("/api/messages", async (req, res) => {
    try {
      const chatMessagesRef = collection(db, "chat_messages");
      const chatQuery = query(chatMessagesRef, orderBy("created_at", "asc"));
      const snapshot = await getDocs(chatQuery);
      const messages = snapshot.docs.map(docNode => docNode.data());
      return res.json({ messages });
    } catch (err) {
      console.error("Failed to query initial messages:", err);
      return res.status(500).json({ error: "Failed to load chat history." });
    }
  });

  // 7. GET /api/campaigns/:campaignId/download-csv: Export communication status records to a CSV file
  app.get("/api/campaigns/:campaignId/download-csv", async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // Get the campaign info
      const campaignSnap = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignSnap.exists()) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const campaign = campaignSnap.data();

      // Get all communications for this campaign
      const commsCollectionRef = collection(db, "communications");
      const allCommsSnapshot = await getDocs(query(commsCollectionRef, where("campaign_id", "==", campaignId)));
      
      // Headers of the CSV
      const headers = [
        "Campaign ID",
        "Campaign Name",
        "Channel",
        "Communication ID",
        "Customer ID",
        "Customer Name",
        "Contact Info",
        "Status",
        "Created At",
        "Sent At",
        "Delivered At",
        "Opened At",
        "Clicked At",
        "Failed At"
      ];

      const rows = [headers.join(",")];

      const escapeCSV = (val: any) => {
        if (val === undefined || val === null) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      allCommsSnapshot.forEach((docNode) => {
        const c = docNode.data();
        const row = [
          escapeCSV(campaignId),
          escapeCSV(campaign.name),
          escapeCSV(campaign.channel),
          escapeCSV(c.id),
          escapeCSV(c.customer_id),
          escapeCSV(c.customer_name),
          escapeCSV(c.contact),
          escapeCSV(c.status),
          escapeCSV(c.created_at || c.timestamp),
          escapeCSV(c.sent_at),
          escapeCSV(c.delivered_at),
          escapeCSV(c.opened_at),
          escapeCSV(c.clicked_at),
          escapeCSV(c.failed_at)
        ];
        rows.push(row.join(","));
      });

      const csvContent = rows.join("\n");
      const filename = `campaign-${campaignId}-report.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error("Failed to generate campaign report CSV:", err);
      return res.status(500).json({ error: "Failed to generate campaign report CSV." });
    }
  });

  // 8. POST /api/campaigns/:campaignId/retry-failed: Re-queues the failed communications and re-triggers sending
  app.post("/api/campaigns/:campaignId/retry-failed", async (req, res) => {
    try {
      const { campaignId } = req.params;

      // Update Campaign Status to 're-sending' (or 'sending')
      const campaignDocRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignDocRef, { status: "sending" });

      // Fetch failed communications for this campaign
      const commsRef = collection(db, "communications");
      const failedQuery = query(commsRef, where("campaign_id", "==", campaignId), where("status", "==", "failed"));
      const failedSnapshot = await getDocs(failedQuery);

      if (failedSnapshot.empty) {
        console.log(`No failed communications found to retry for campaign ${campaignId}`);
        await updateDoc(campaignDocRef, { status: "completed" });
        return res.json({ retried_count: 0 });
      }

      console.log(`Retrying ${failedSnapshot.size} failed communications for campaign ID: ${campaignId}`);

      const scheduledJobs = failedSnapshot.docs.map(async (docSnap) => {
        const commData = docSnap.data();
        const commId = commData.id;

        // Reset to queued state
        await updateDoc(doc(db, "communications", commId), {
          status: "queued",
          sent_at: null,
          delivered_at: null,
          failed_at: null,
          opened_at: null,
          clicked_at: null
        });

        const payload = {
          communication_id: commId,
          recipient_name: commData.customer_name || commData.name || "Customer",
          recipient_phone: commData.phone || "+919876543210",
          recipient_email: commData.email || "customer@example.com",
          message: commData.message,
          channel: commData.channel
        };

        // Call client channel services
        try {
          fetch(`http://127.0.0.1:${PORT}/channel/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(err => console.error("Async channel dispatch error during retry:", err));

          // Reset status to sent
          await updateDoc(doc(db, "communications", commId), {
            status: "sent",
            sent_at: new Date().toISOString()
          });

          return { success: true, id: commId };
        } catch (error) {
          console.error(`Retry dispatch failed for comm ${commId}:`, error);
          return { success: false, id: commId };
        }
      });

      const results = await Promise.allSettled(scheduledJobs);
      const successfulCount = results.filter(r => r.status === "fulfilled").length;

      // Force instant campaign stats recalculation to decrease 'failed' counter
      const allCommsSnapshot = await getDocs(query(commsRef, where("campaign_id", "==", campaignId)));
      let totalQueued = allCommsSnapshot.size;
      let totalSent = 0;
      let delivered = 0;
      let failed = 0;
      let opened = 0;
      let clicked = 0;

      allCommsSnapshot.forEach(docNode => {
        const c = docNode.data();
        if (c.sent_at) totalSent++;
        if (c.status === "delivered") delivered++;
        if (c.status === "failed") failed++;
        if (c.status === "opened") opened++;
        if (c.status === "clicked") clicked++;
        if (c.opened_at) opened++;
        if (c.clicked_at) clicked++;
        if (c.delivered_at) delivered++;
        if (c.failed_at) failed++;
      });

      const dedupOpened = Math.min(opened, totalSent);
      const dedupClicked = Math.min(clicked, dedupOpened);
      const dedupDelivered = Math.min(delivered, totalSent);

      const statsRef = doc(db, "campaign_stats", campaignId);
      await setDoc(statsRef, {
        campaign_id: campaignId,
        total_queued: totalQueued,
        total_sent: totalSent,
        delivered: dedupDelivered,
        failed: failed,
        opened: dedupOpened,
        clicked: dedupClicked,
        last_updated: new Date().toISOString()
      }, { merge: true });

      // Reset campaign status back to completed so statistics finish and card allows download
      await updateDoc(campaignDocRef, { status: "completed" });

      return res.json({ retried_count: successfulCount });
    } catch (err) {
      console.error("Failed to execute failed retries:", err);
      return res.status(500).json({ error: "Failed to execute failed retries." });
    }
  });

  // ==========================================
  // VITE DEV SERVER / PRODUCTION SERVING
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite loading in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets compiled inside dist/
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`================================================`);
    console.log(`Xeno Mini Node.js Server listening on port ${PORT}`);
    console.log(`Local Access: http://localhost:${PORT}`);
    console.log(`Active Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`================================================`);
  });
}

startServer().catch(err => {
  console.error("Critical error during full-stack server initialization:", err);
});
