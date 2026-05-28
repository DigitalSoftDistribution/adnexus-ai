import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  X,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const EXAMPLE_PROMPTS = [
  {
    text: "Which campaigns have the highest ROAS?",
    icon: TrendingUp,
  },
  {
    text: "Why did my CPA increase this week?",
    icon: AlertTriangle,
  },
  {
    text: "What should I optimize first?",
    icon: Lightbulb,
  },
  {
    text: "Compare Meta vs Google performance",
    icon: BarChart3,
  },
];

const getDemoResponse = (query: string): string => {
  const q = query.toLowerCase();

  if (q.includes("roas")) {
    return `Here are your top-performing campaigns by ROAS:

**1. Summer Sale 2024** — ROAS: **4.8x**
   • Spend: $12,400 → Revenue: $59,520
   • Platform: Meta Ads

**2. Retargeting - Cart Abandoners** — ROAS: **4.2x**
   • Spend: $8,200 → Revenue: $34,440
   • Platform: Google Ads

**3. Lookalike - Top 1%** — ROAS: **3.9x**
   • Spend: $15,600 → Revenue: $60,840
   • Platform: Meta Ads

💡 **Insight:** Your retargeting campaigns are delivering the strongest returns. Consider increasing budget allocation to "Summer Sale 2024" by 20%.`;
  }

  if (q.includes("cpa") || q.includes("cost")) {
    return `Here's your CPA analysis for this week:

**Highest CPA Campaigns:**

**1. Brand Awareness - Video** — CPA: **$68.50**
   • Up 34% from last week ($51.10)
   • Impressions dropped 22%

**2. Prospecting - Broad Audience** — CPA: **$54.20**
   • Up 18% from last week ($45.90)
   • CVR decreased from 2.1% to 1.6%

**3. Google - Display Network** — CPA: **$47.80**
   • Up 12% from last week ($42.60)

⚠️ **Root Cause:** CPMs increased across Meta (+28%) and Google (+15%) due to Q4 auction competition. Your creative frequency is also high (>3.5x).

🔧 **Recommendation:** Refresh creatives and tighten audience targeting to reduce wasted spend.`;
  }

  if (q.includes("compare") || q.includes("vs")) {
    return `**Meta vs Google Performance (Last 30 Days)**

| Metric | Meta Ads | Google Ads | Difference |
|--------|----------|------------|------------|
| Spend | $48,200 | $36,800 | — |
| Revenue | $186,500 | $128,400 | — |
| **ROAS** | **3.87x** | **3.49x** | Meta +11% |
| **CPA** | **$42.30** | **$38.70** | Google -8% |
| CTR | 1.85% | 3.42% | Google +85% |
| Conv. Rate | 2.4% | 1.8% | Meta +33% |

📊 **Key Takeaway:**
• **Meta** delivers higher ROAS and better conversion rates — best for scaling revenue
• **Google** has lower CPA and higher CTR — best for efficient customer acquisition

💡 **Strategy:** Allocate 55% budget to Meta (revenue) and 45% to Google (efficiency).`;
  }

  if (q.includes("optimize") || q.includes("improve") || q.includes("fix")) {
    return `**Top 5 Optimization Recommendations:**

**1. 🚨 Urgent: Refresh Creatives**
   • 4 campaigns have frequency >3x
   • Creative fatigue is driving up CPAs by 25%+
   • Action: Launch 6 new creatives this week

**2. ⚡ Quick Win: Pause Underperformers**
   • "Brand Awareness - Video" (CPA $68.50, ROAS 0.8x)
   • "Display - Remarketing" (CPA $52.10, 0 conversions in 7 days)
   • **Potential savings: ~$8,400/month**

**3. 💰 Scale Winners**
   • Increase "Summer Sale 2024" budget by 30%
   • Increase "Retargeting" budget by 20%
   • Expected incremental revenue: +$15,000

**4. 🎯 Audience Refinement**
   • Exclude 18-24 age group (CPA 2x higher than 25-34)
   • Focus on lookalike audiences (ROAS 3.9x vs 2.1x for interest targeting)

**5. 📱 Platform Allocation**
   • Shift 10% budget from Google Display to Meta retargeting
   • Estimated ROAS improvement: +0.4x overall`;
  }

  return `I can help analyze your ad data. Try asking about:

• **ROAS** — "Which campaigns have the highest ROAS?"
• **CPA** — "Why did my CPA increase this week?"
• **Comparison** — "Compare Meta vs Google performance"
• **Optimization** — "What should I optimize first?"`;
};

const AskAIWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response = getDemoResponse(text);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleExampleClick = (prompt: string) => {
    handleSend(prompt);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #c3f53b 0%, #a8d932 100%)",
              boxShadow: "0 8px 32px rgba(195, 245, 59, 0.35)",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="h-6 w-6 text-[#0a0a0a]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] shadow-2xl"
            style={{
              width: "400px",
              height: "500px",
              backgroundColor: "#111111",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(195, 245, 59, 0.1)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3"
              style={{ backgroundColor: "#161616" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #c3f53b 0%, #a8d932 100%)",
                  }}
                >
                  <Sparkles className="h-4 w-4 text-[#0a0a0a]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Ask AI about your ads
                  </h3>
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "#c3f53b" }}
                    />
                    <span className="text-[11px] text-[#888]">
                      Demo mode
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="rounded-lg px-2 py-1.5 text-[11px] text-[#666] transition-colors hover:bg-[#222] hover:text-[#999]"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-[#666] transition-colors hover:bg-[#222] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{ backgroundColor: "#111111" }}
            >
              {messages.length === 0 ? (
                /* Welcome State with Example Prompts */
                <div className="flex h-full flex-col">
                  <div className="mb-4 flex flex-col items-center justify-center pt-6 text-center">
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(195, 245, 59, 0.15) 0%, rgba(195, 245, 59, 0.05) 100%)",
                        border: "1px solid rgba(195, 245, 59, 0.2)",
                      }}
                    >
                      <Bot
                        className="h-6 w-6"
                        style={{ color: "#c3f53b" }}
                      />
                    </div>
                    <h4 className="mb-1 text-sm font-medium text-white">
                      Ad Intelligence Assistant
                    </h4>
                    <p className="max-w-[260px] text-xs leading-relaxed text-[#666]">
                      Ask me anything about your campaigns, performance
                      metrics, or optimization strategies.
                    </p>
                  </div>

                  <p className="mb-2.5 px-1 text-[11px] font-medium uppercase tracking-wider text-[#555]">
                    Try asking
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {EXAMPLE_PROMPTS.map((prompt, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        onClick={() => handleExampleClick(prompt.text)}
                        className="group flex items-center gap-3 rounded-xl border border-[#222] bg-[#181818] px-3 py-2.5 text-left transition-all hover:border-[#333] hover:bg-[#1e1e1e]"
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: "rgba(195, 245, 59, 0.1)" }}
                        >
                          <prompt.icon
                            className="h-4 w-4"
                            style={{ color: "#c3f53b" }}
                          />
                        </div>
                        <span className="flex-1 text-xs text-[#bbb] group-hover:text-white">
                          {prompt.text}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#444] group-hover:text-[#777]" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <div className="flex flex-col gap-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          msg.role === "assistant"
                            ? ""
                            : "bg-[#2a2a2a]"
                        }`}
                        style={
                          msg.role === "assistant"
                            ? {
                                background:
                                  "linear-gradient(135deg, #c3f53b 0%, #a8d932 100%)",
                              }
                            : {}
                        }
                      >
                        {msg.role === "assistant" ? (
                          <Sparkles className="h-3.5 w-3.5 text-[#0a0a0a]" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-[#888]" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          msg.role === "user"
                            ? "rounded-tr-sm"
                            : "rounded-tl-sm"
                        }`}
                        style={{
                          backgroundColor:
                            msg.role === "user" ? "#c3f53b" : "#1a1a1a",
                        }}
                      >
                        <p
                          className={`whitespace-pre-wrap text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "font-medium text-[#0a0a0a]"
                              : "text-[#ccc]"
                          }`}
                        >
                          {msg.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, #c3f53b 0%, #a8d932 100%)",
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#0a0a0a]" />
                      </div>
                      <div
                        className="rounded-2xl rounded-tl-sm px-4 py-3"
                        style={{ backgroundColor: "#1a1a1a" }}
                      >
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: "#c3f53b" }}
                              animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [0.8, 1.1, 0.8],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.15,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div
              className="border-t border-[#2a2a2a] px-3 py-3"
              style={{ backgroundColor: "#161616" }}
            >
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your ad performance..."
                  className="flex-1 rounded-xl border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white outline-none transition-all placeholder:text-[#555] focus:border-[#c3f53b]/50 focus:ring-1 focus:ring-[#c3f53b]/20"
                  style={{ backgroundColor: "#1a1a1a" }}
                />
                <motion.button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-30"
                  style={{
                    background:
                      inputValue.trim() && !isTyping
                        ? "linear-gradient(135deg, #c3f53b 0%, #a8d932 100%)"
                        : "#2a2a2a",
                  }}
                >
                  <Send
                    className={`h-4 w-4 ${
                      inputValue.trim() && !isTyping
                        ? "text-[#0a0a0a]"
                        : "text-[#666]"
                    }`}
                  />
                </motion.button>
              </form>
              <p className="mt-2 text-center text-[10px] text-[#444]">
                AI responses are simulated for demo purposes
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AskAIWidget;
