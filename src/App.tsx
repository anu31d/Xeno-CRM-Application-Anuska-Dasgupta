import React, { useState, useEffect, useRef } from "react";
import { 
  Rocket, 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Flame, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Layers, 
  ArrowRight,
  TrendingUp,
  BarChart3,
  MousePointerClick,
  Eye,
  Check,
  Download,
  BookOpen,
  HelpCircle,
  Activity,
  Database,
  MapPin,
  Info,
  X,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AudiencePreviewItem {
  id: string;
  name: string;
  city: string;
  total_spent: number;
}

interface MessageMetadata {
  campaign_id?: string;
  campaign_name?: string;
  segment_description?: string;
  audience_count?: number;
  audience_preview?: AudiencePreviewItem[];
  channel?: "whatsapp" | "sms" | "email";
  message_template?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: MessageMetadata;
  created_at: string;
}

interface CampaignStatItem {
  total_queued: number;
  total_sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

interface CampaignItem {
  id: string;
  name: string;
  channel: "whatsapp" | "sms" | "email";
  status: "draft" | "sending" | "completed";
  created_at: string;
  segment_description: string;
  stats: CampaignStatItem;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignStatusMap, setCampaignStatusMap] = useState<Record<string, "idle" | "firing" | "completed">>({});
  const [editingTemplateMap, setEditingTemplateMap] = useState<Record<string, string>>({});
  const [isRetryingMap, setIsRetryingMap] = useState<Record<string, boolean>>({});
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [highlightStatsPanel, setHighlightStatsPanel] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<"all" | "draft" | "sending" | "completed">("all");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load of Messages and Stats
  useEffect(() => {
    // Load initial chat messages from backend
    const loadMessages = async () => {
      try {
        const res = await fetch("/api/messages");
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Default welcoming context message with rich proactive analysis suggestions
          setMessages([
            {
              id: "welcome-id",
              role: "assistant",
              content: "Welcome to Xeno Mini! 🚀\nI'm your AI marketer. Describe your retail campaign goals in plain English, and I will parse your intent, construct custom segments from our regional database, draft a personalized template, and launch your multichannel engagements.\n\n💡 Proactive Insights: I've analyzed our local CRM state and noticed that 12 high-value lapsing customers haven't ordered in 45+ days, and we also have 8 high-value dormant buyers with total spends exceeding 20,000 who haven't returned in 90+ days. Would you like me to draft a WhatsApp or SMS win-back campaign for either of these segments?",
              created_at: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.error("Error retrieving initial chat stream:", err);
      }
    };

    // Load dynamic statistics
    const loadStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.campaigns) {
          setCampaigns(data.campaigns);
        }
      } catch (err) {
        console.error("Error retrieving stats telemetry:", err);
      }
    };

    loadMessages();
    loadStats();

    // 2. Poll statistics every 3 seconds
    const statsInterval = setInterval(loadStats, 3000);
    return () => clearInterval(statsInterval);
  }, []);

  // Auto scroll triggers when messages expand
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // 3. Dispatch Campaign Intent Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const userText = inputText.trim();
    setInputText("");
    setIsGenerating(true);

    // Append user bubble instantly
    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      if (res.ok) {
        // Append Gemini mapped assistant bubble
        const assistantMessage: ChatMessage = {
          id: data.campaign_id || Math.random().toString(),
          role: "assistant",
          content: data.ai_reply,
          metadata: data.campaign_id ? {
            campaign_id: data.campaign_id,
            campaign_name: data.campaign_name || "New Segment Draft",
            segment_description: data.segment_description || "Targeted criteria matching customers",
            audience_count: data.audience_count,
            audience_preview: data.audience_preview,
            channel: data.channel || "whatsapp",
            message_template: data.message_template
          } : undefined,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Error bubble fallback
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: "assistant",
          content: data.ai_reply || "I encountered an error understanding that requirement. Let's try specifying high-value spenders, lapsing customers, or targeting active cities.",
          created_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error("Failed to query API chat handler:", err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: "assistant",
        content: "Network glitch. Ensure the CRM server is active and the API secret keys are securely linked.",
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Trigger Campaign Send Webhook Dispatcher
  const handleFireCampaign = async (campaignId: string, customTemplate?: string) => {
    if (campaignStatusMap[campaignId] === "firing") return;

    setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "firing" }));

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          campaign_id: campaignId,
          custom_template: customTemplate
        })
      });
      const data = await res.json();

      if (res.ok) {
        setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "completed" }));
        // Instantly invoke stats update
        const statsRes = await fetch("/api/stats");
        const statsData = await statsRes.json();
        if (statsData.campaigns) {
          setCampaigns(statsData.campaigns);
        }
      } else {
        setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "idle" }));
      }
    } catch (err) {
      console.error("Failed to initiate campaign dispatch:", err);
      setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "idle" }));
    }
  };

  // 5. Trigger Campaign Retries for Failed Logs
  const handleRetryFailed = async (campaignId: string) => {
    if (isRetryingMap[campaignId]) return;
    setIsRetryingMap(prev => ({ ...prev, [campaignId]: true }));
    setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "firing" }));

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/retry-failed`, {
        method: "POST"
      });
      if (res.ok) {
        // Instantly reload stats
        const statsRes = await fetch("/api/stats");
        const statsData = await statsRes.json();
        if (statsData.campaigns) {
          setCampaigns(statsData.campaigns);
        }
        setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "completed" }));
      } else {
        console.error("Failed to retry campaign failures.");
        setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "completed" }));
      }
    } catch (err) {
      console.error("Error retrying failures:", err);
      setCampaignStatusMap(prev => ({ ...prev, [campaignId]: "completed" }));
    } finally {
      setIsRetryingMap(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // 5. Download campaign report CSV
  const handleDownloadCSV = async (campaignId: string, campaignName: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/download-csv`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaign report CSV.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Error downloading campaign report CSV. Please try again.");
    }
  };

  // Color mappings for channels
  const getChannelConfig = (channel?: "whatsapp" | "sms" | "email") => {
    switch (channel) {
      case "whatsapp":
        return {
          icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
          badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          textClass: "text-emerald-400"
        };
      case "sms":
        return {
          icon: <Smartphone className="w-4 h-4 text-blue-400" />,
          badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          textClass: "text-blue-400"
        };
      case "email":
        return {
          icon: <Mail className="w-4 h-4 text-purple-400" />,
          badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
          textClass: "text-purple-400"
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
          badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
          textClass: "text-indigo-400"
        };
    }
  };

  const handleFocusLiveCampaigns = () => {
    setHighlightStatsPanel(true);
    setTimeout(() => {
      setHighlightStatsPanel(false);
    }, 2000);
    
    const container = document.getElementById("stats-list-container");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (campaignFilter === "all") return true;
    return c.status === campaignFilter;
  });

  return (
    <div id="crm-app-wrapper" className="flex h-screen bg-[#0f0f0f] text-slate-100 font-sans select-none overflow-hidden border border-white/5 shadow-2xl">
      
      {/* LEFT SIDEBAR MENU */}
      <div id="left-sidebar" className="w-64 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col h-full shrink-0 z-20">
        {/* Brand Group */}
        <div className="h-16 px-6 border-b border-[#2a2a2a] flex items-center gap-3 bg-[#0d0d0d]">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-xs tracking-tighter shadow-lg shadow-indigo-500/20 text-white shrink-0">
            XN
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight uppercase text-white flex items-center gap-1.5 leading-none">
              Xeno Mini
            </span>
            <span className="text-[9px] text-indigo-400 font-mono font-semibold uppercase tracking-wider mt-1">
              AI-CRM Engine
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-600 font-bold tracking-widest uppercase block pl-2">
              Console Hub
            </span>
            <div className="space-y-1">
              <button
                id="sidebar-live-campaigns"
                onClick={handleFocusLiveCampaigns}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <Activity className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <span className="text-xs font-semibold tracking-wide">Live Campaigns</span>
              </button>

              <button
                id="sidebar-how-to-use"
                onClick={() => setShowHowToUse(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer group"
              >
                <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-semibold tracking-wide">How to Use App</span>
              </button>
            </div>
          </div>

          {/* Database Info section */}
          <div className="space-y-3 pt-4 border-t border-white/[0.03]">
            <span className="text-[10px] text-slate-600 font-bold tracking-widest uppercase block pl-2">
              Regional Core DB
            </span>
            <div className="bg-[#111] border border-white/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">Status:</span>
                <span className="text-emerald-400 font-bold font-mono uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  Synced
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">Contacts:</span>
                <span className="text-slate-300 font-bold font-mono">1,240 Total</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">Engine:</span>
                <span className="text-indigo-400 font-semibold font-mono">Xeno-v2 (SQL)</span>
              </div>
            </div>
          </div>

          {/* Quick Tips or Preset Info */}
          <div className="space-y-2 pt-4 border-t border-white/[0.03]">
            <span className="text-[10px] text-slate-600 font-bold tracking-widest uppercase block pl-2">
              Console Tips
            </span>
            <div className="bg-[#111]/45 border border-white/[0.03] rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed font-sans italic">
              "Type queries like 'Target India customers with spend above 1000' and press Enter to instantly prompt segment filters."
            </div>
          </div>
        </div>

        {/* Sidebar Footer Account Section */}
        <div className="p-4 border-t border-[#2a2a2a] bg-[#0d0d0d] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[12px] font-bold text-slate-200 block truncate leading-tight">Anuska Dasgupta</span>
            <span className="text-[9.5px] text-slate-500 block truncate font-mono">anuska.dasguptaa@gmail.com</span>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: Chat-First Intent Console (Flex-1) */}
      <div id="chat-panel" className="flex-1 border-r border-[#2a2a2a] bg-[#121212]/30 flex flex-col h-full relative">
        
        {/* Header segment bar */}
        <header id="chat-header" className="h-16 px-8 flex items-center justify-between border-b border-[#2a2a2a] bg-[#1a1a1a]/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
              AI Marketing Copilot
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 tracking-wider font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            COGNITIVE ENGINE ONLINE
          </div>
        </header>

        {/* Message Feeds Scroll Container */}
        <div id="chat-scroller" className="flex-1 overflow-y-auto p-8 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const cConfig = getChannelConfig(msg.metadata?.channel);

              return (
                <motion.div
                  key={msg.id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${isUser ? "justify-end self-end" : "justify-start self-start"} w-full`}
                  id={`msg-container-${msg.id}`}
                >
                  {isUser ? (
                    <div className="flex justify-end self-end max-w-[85%] ml-auto">
                      <div className="bg-indigo-600/10 border border-indigo-500/20 px-5 py-3 rounded-2xl rounded-tr-none shadow-sm">
                        <p className="text-[14px] text-slate-200 leading-relaxed italic">
                          "{msg.content}"
                        </p>
                        <div className="text-[9px] text-right mt-1.5 opacity-40 font-mono" id={`timestamp-${msg.id}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 self-start max-w-[90%] mr-auto">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center border border-white/10 self-start">
                        <Sparkles className="w-4 h-4 text-slate-400" />
                      </div>
                      
                      <div className="flex flex-col gap-4 flex-1">
                        {/* Conversational Text Block */}
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-5 py-3 rounded-2xl rounded-tl-none self-start">
                          <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-line">
                            {msg.content}
                          </p>
                          <div className="text-[9px] text-left mt-1.5 opacity-40 font-mono" id={`timestamp-${msg.id}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* MAPPED CAMPAIGN CARD INSIDE ASSISTANT BUBBLE */}
                        {msg.metadata?.campaign_id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1a1a1a] border border-indigo-500/30 rounded-xl overflow-hidden shadow-xl shadow-black/40 w-full max-w-sm"
                            id={`campaign-card-${msg.metadata.campaign_id}`}
                          >
                            <div className="bg-indigo-600/5 px-4 py-3 border-b border-[#2a2a2a] flex justify-between items-center">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                                Campaign Proposed
                              </h3>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-500/20 tracking-wider font-mono">
                                {msg.metadata.channel?.toUpperCase()}
                              </span>
                            </div>

                            <div className="p-4 flex flex-col gap-3">
                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Segment</span>
                                <span className="text-[11px] text-slate-200 font-medium italic">{msg.metadata.campaign_name}</span>
                              </div>

                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Audience</span>
                                <span className="text-[11px] text-slate-200 font-mono">{msg.metadata.audience_count} Contacts</span>
                              </div>

                               <div className="bg-[#0f0f0f] p-3 rounded border border-[#2a2a2a] focus-within:border-indigo-500/50 transition-colors">
                                <label className="text-[9px] font-mono text-slate-500 block mb-1 uppercase tracking-wider">
                                  Message Template Draft (Editable)
                                </label>
                                <textarea
                                  id={`edit-template-${msg.metadata.campaign_id}`}
                                  value={
                                    editingTemplateMap[msg.metadata.campaign_id!] !== undefined
                                      ? editingTemplateMap[msg.metadata.campaign_id!]
                                      : msg.metadata.message_template || ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingTemplateMap(prev => ({
                                      ...prev,
                                      [msg.metadata!.campaign_id!]: val
                                    }));
                                  }}
                                  disabled={campaignStatusMap[msg.metadata.campaign_id!] === "firing" || campaignStatusMap[msg.metadata.campaign_id!] === "completed"}
                                  className="w-full text-[12.5px] text-slate-300 bg-transparent border-none p-0 resize-none h-16 focus:outline-none focus:ring-0 leading-snug italic font-medium"
                                  placeholder="Type custom campaign message..."
                                />
                                <div className="mt-1.5 flex justify-between items-center text-[9px] font-mono text-slate-600 border-t border-white/5 pt-1.5">
                                  <span>USE name IN curly braces for customization</span>
                                  <span>{((editingTemplateMap[msg.metadata.campaign_id!] !== undefined ? editingTemplateMap[msg.metadata.campaign_id!] : msg.metadata.message_template || "").length)} Chars</span>
                                </div>
                              </div>

                              {/* Target sampling preview list if existing */}
                              {msg.metadata.audience_preview && msg.metadata.audience_preview.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase block">Audience Sample:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {msg.metadata.audience_preview.map((cp, idx) => (
                                      <span key={cp.id || idx} className="text-[10px] bg-[#0f0f0f] border border-[#2a2a2a] px-2 py-0.5 rounded text-slate-400 font-mono">
                                        {cp.name} ({cp.city})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Dispatched Trigger button matching Design criteria exactly */}
                              <button
                                id={`btn-fire-${msg.metadata.campaign_id}`}
                                onClick={() => handleFireCampaign(
                                  msg.metadata!.campaign_id!,
                                  editingTemplateMap[msg.metadata!.campaign_id!] !== undefined 
                                    ? editingTemplateMap[msg.metadata!.campaign_id!] 
                                    : msg.metadata!.message_template
                                )}
                                disabled={campaignStatusMap[msg.metadata.campaign_id!] === "firing" || campaignStatusMap[msg.metadata.campaign_id!] === "completed"}
                                className={`w-full text-[13px] font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-1 transition-all duration-300 ${
                                  campaignStatusMap[msg.metadata.campaign_id] === "completed"
                                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 font-mono"
                                    : campaignStatusMap[msg.metadata.campaign_id] === "firing"
                                    ? "bg-amber-600/20 text-amber-500 border border-amber-600/30 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer transition-colors"
                                }`}
                              >
                                {campaignStatusMap[msg.metadata.campaign_id] === "completed" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> CAMPAIGN COMPLETED
                                  </>
                                ) : campaignStatusMap[msg.metadata.campaign_id] === "firing" ? (
                                  <>
                                    <span className="animate-spin h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent rounded-full mr-1" />
                                    LAUNCHING...
                                  </>
                                ) : (
                                  <>
                                    FIRE CAMPAIGN <span className="text-base">🚀</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Simulated generation typing indicator */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-4 self-start max-w-[90%] mr-auto"
                id="typing-indicator"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center border border-white/10">
                  <Sparkles className="w-4 h-4 text-slate-400 animate-pulse" />
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-5 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">
                      Gemini mapping custom parameters...
                    </span>
                    <div className="flex space-x-1 items-center">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Console and quick selectors */}
        <footer id="chat-input-area" className="p-6 bg-[#0f0f0f] border-t border-[#2a2a2a]">
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-2 text-xs scrollbar-thin scrollbar-thumb-zinc-700">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase shrink-0 mr-1">QUICK PRESETS:</span>
            <button 
              id="prompt-preset-1"
              type="button"
              onClick={() => setInputText("Draft a campaign for our loyal customers offering a 20% discount on new beauty items over WhatsApp.")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              Loyal Beauty 🌸
            </button>
            <button 
              id="prompt-preset-2"
              type="button"
              onClick={() => setInputText("Segment lapsing customers who haven't ordered in 45 days and compose an SMS wakeup coupon")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              Lapsing SMS 💬
            </button>
            <button 
              id="prompt-preset-3"
              type="button"
              onClick={() => setInputText("Find dormant customers in Mumbai with total spent above 10000 and offer a revival discount")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              Mumbai Dormant 🏙️
            </button>
            <button 
              id="prompt-preset-4"
              type="button"
              onClick={() => setInputText("Target Delhi customers who bought fitness items to suggest a WhatsApp wellness bundle sale")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              Delhi Fitness 🏋️
            </button>
            <button 
              id="prompt-preset-5"
              type="button"
              onClick={() => setInputText("Recommend new arrivals via email to high spenders with total spend above 20000")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              High Spenders 💎
            </button>
            <button 
              id="prompt-preset-6"
              type="button"
              onClick={() => setInputText("Show me campaign stats summary and open rates")}
              className="px-2.5 py-1 rounded-full bg-[#1e1e1e] text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-indigo-500/50 cursor-pointer text-[10px] shrink-0 transition-colors"
            >
              Check Stats 📊
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="relative flex items-center" id="chat-form">
            <input
              id="chat-input-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your campaign intent..."
              disabled={isGenerating}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-6 py-4 text-[14px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all pr-24"
              autoComplete="off"
            />
            
            <div className="absolute right-4 flex items-center gap-2">
              <button
                id="chat-submit-btn"
                type="submit"
                disabled={isGenerating || !inputText.trim()}
                className="bg-indigo-600 p-2.5 rounded-lg text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </footer>
      </div>

      {/* RIGHT PANEL: Live Active Monitor (35%) */}
      <div 
        id="stats-panel" 
        className={`w-[35%] bg-[#1a1a1a] flex flex-col h-full shadow-inner border-l border-[#2a2a2a]/30 transition-all duration-500 ${
          highlightStatsPanel 
            ? "ring-2 ring-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] border-indigo-500/80 bg-[#1e1e24]" 
            : ""
        }`}
      >
        
        {/* Panel Header */}
        <header id="stats-header" className="h-16 px-6 flex items-center justify-between border-b border-[#2a2a2a] bg-[#141414]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Live Campaigns</h2>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">POLLING...</span>
            <div className="w-4 h-4 bg-indigo-500/10 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            </div>
          </div>
        </header>

        {/* Campaign Filter Options Area */}
        <div id="campaigns-filter-bar" className="px-6 py-2.5 border-b border-[#2a2a2a] bg-[#121212] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Status:</span>
          <div className="flex gap-1 bg-[#090909] p-1 rounded-lg border border-white/5">
            {(["all", "draft", "sending", "completed"] as const).map((mode) => {
              const isActive = campaignFilter === mode;
              const count = mode === "all" 
                ? campaigns.length 
                : campaigns.filter(c => c.status === mode).length;

              return (
                <button
                  key={mode}
                  id={`filter-btn-${mode}`}
                  type="button"
                  onClick={() => setCampaignFilter(mode)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                  }`}
                >
                  <span>{mode}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campaigns Telemetry List */}
        <div id="stats-list-container" className="flex-1 overflow-y-auto p-6 space-y-4">
          {campaigns.length === 0 ? (
            <div id="stats-empty" className="h-full flex flex-col items-center justify-center text-center px-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl py-16">
              <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-4 text-slate-500">
                <BarChart3 className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-wider mb-1">
                Telemetry Engine Idle
              </p>
              <p className="text-[11px] text-slate-600 max-w-[200px] leading-relaxed">
                Automated reporting for real-time engagement monitoring will start presenting data as soon as you initiate campaigns.
              </p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div id="filter-empty" className="h-4/5 flex flex-col items-center justify-center text-center px-12 py-16">
              <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-4 text-slate-500">
                <Info className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed uppercase tracking-wider mb-1">
                No campaigns match criteria
              </p>
              <p className="text-[11px] text-slate-600 max-w-[220px] leading-relaxed">
                We couldn't detect any campaigns with status "{campaignFilter.toUpperCase()}" right now. Try switching filters or creating a new campaign.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredCampaigns.map((c) => {
                // Rate mathematical conversions
                const total = c.stats.total_queued || 0;
                const sent = c.stats.total_sent || 0;
                const delivered = c.stats.delivered || 0;
                const failed = c.stats.failed || 0;
                const opened = c.stats.opened || 0;
                const clicked = c.stats.clicked || 0;

                const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
                const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

                return (
                  <motion.div
                    key={c.id}
                    layoutId={c.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-4 shadow-lg transition-all duration-300 hover:border-indigo-500/25 ${
                      c.status === "completed" ? "opacity-75" : ""
                    }`}
                    id={`stats-card-${c.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                          {c.status === 'completed' ? 'Completed Event' : 'Recent Event'}
                        </span>
                        <h3 className="text-sm font-semibold tracking-tight text-slate-200">{c.name}</h3>
                        <p className="text-[11px] text-slate-500 italic mt-0.5 font-medium leading-tight">
                          "{c.segment_description}"
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border tracking-wide uppercase font-mono ${
                        c.channel === 'whatsapp' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : c.channel === 'sms' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {c.channel.toUpperCase()}
                      </span>
                    </div>

                    {/* Funnel values grid inside card */}
                    <div className="grid grid-cols-6 gap-1.5 bg-[#080808]/40 p-2.5 rounded-lg border border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold">Queued</span>
                        <span className="text-sm font-mono font-bold text-slate-400">{total}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold">Sent</span>
                        <span className="text-sm font-mono font-bold text-slate-400">{sent}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold text-emerald-400">Dlvrd</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{delivered}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold text-rose-500">Failed</span>
                        <span className={`text-sm font-mono font-bold ${failed > 0 ? "text-rose-500 animate-pulse" : "text-slate-500"}`}>{failed}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold text-amber-500">Open</span>
                        <span className="text-sm font-mono font-bold text-amber-500">{opened}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-600 uppercase font-semibold text-indigo-400">Click</span>
                        <span className="text-sm font-mono font-bold text-indigo-400">{clicked}</span>
                      </div>
                    </div>

                    {/* Funnel visual slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-slate-600">
                        <span>PROGRESS MONITOR</span>
                        <span>{sent} OF {total} SENT</span>
                      </div>
                      <div className="w-full h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${total > 0 ? (sent / total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Surfaced Failure Warnings & Retry Trigger */}
                    {failed > 0 && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-rose-500/10 border border-rose-500/15 rounded-lg">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="text-[11px] text-rose-400 font-medium truncate">
                            {failed} communication failures occurred.
                          </span>
                        </div>
                        <button
                          onClick={() => handleRetryFailed(c.id)}
                          disabled={campaignStatusMap[c.id] === "firing" || isRetryingMap[c.id]}
                          className="px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:text-white bg-[#250d12] hover:bg-[#3f131a] border border-rose-900/50 rounded-md transition-all cursor-pointer select-none whitespace-nowrap"
                        >
                          {isRetryingMap[c.id] ? "RETRYING..." : "RETRY FAILURES"}
                        </button>
                      </div>
                    )}

                    {/* Custom dynamic values footer tag aligned with mock */}
                    <div className="flex justify-between items-center bg-[#070707]/20 pt-1">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-600 uppercase font-mono">Delivery Rate</span>
                          <span className="text-[11px] font-bold text-emerald-500 font-mono">{deliveryRate}%</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-600 uppercase font-mono font-medium">CTR</span>
                          <span className="text-[11px] font-bold text-indigo-500 font-mono">{openRate > 0 ? ((clicked / opened) * 100).toFixed(1) : "0.0"}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          title="Download report CSV"
                          onClick={() => handleDownloadCSV(c.id, c.name)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-md transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV</span>
                        </button>

                        {c.status !== "completed" ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-md">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider font-mono">Live</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider font-mono">Completed</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ONBOARDING / HOW TO USE MODAL */}
      <AnimatePresence>
        {showHowToUse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowHowToUse(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#141414] border border-[#2a2a2a] max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#1a1a1a]/80 px-6 py-4 border-b border-[#2a2a2a] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    How to Use Xeno Mini
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHowToUse(false)}
                  className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <p className="text-[12.5px] text-slate-400 leading-relaxed mb-2">
                  Xeno Mini is an AI-powered CRM campaigning engine that dynamically parses your retail targets into database filters, generates highly tailored communication drafts, and measures customer engagement live.
                </p>

                <div className="space-y-4 font-sans">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold font-mono shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-200 block">Describe Your Retail Target</span>
                      <p className="text-[11.5px] text-slate-400 leading-relaxed">
                        Type who you want to engage in simple English. For example, <span className="text-indigo-400 font-mono italic">"Target loyal customers spending above 15000"</span>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold font-mono shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-200 block">AI Segment Translation</span>
                      <p className="text-[11.5px] text-slate-400 leading-relaxed">
                        The agent immediately translates your query into direct, secure backend queries against the CRM database, returning accurate match statistics.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold font-mono shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-200 block">Personalize templates on the fly</span>
                      <p className="text-[11.5px] text-slate-400 leading-relaxed">
                        Review the proposed channel (SMS/WhatsApp/Email) and edit the template inline using curly bracket variables. E.g. <span className="text-emerald-400 font-mono">{"{{name}}"}</span> is replaced with customers' names automatically.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold font-mono shrink-0 mt-0.5">
                      4
                    </span>
                    <div className="space-y-1">
                      <span className="text-[13px] font-bold text-slate-200 block">Fire and Monitor Live Telemetry</span>
                      <p className="text-[11.5px] text-slate-400 leading-relaxed">
                        Execute the queue! Track progression rates, successful delivery, failed logs, opens, and link clicks updated in real-time in the polling monitor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#1a1a1a]/50 p-4 border-t border-[#2a2a2a] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHowToUse(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  GOT IT, LET'S MARKET
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
