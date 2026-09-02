import React, { useState, useEffect, useRef } from "react";
import styles from "./AIChat.module.css";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import FlightIcon from "@mui/icons-material/Flight";
import HotelIcon from "@mui/icons-material/Hotel";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Welcome to **SkyNora AI Travel Agent**!\n\nI am your real-time travel planning assistant powered by live API data (flights, hotels, weather, currency, activities & food). Every fact I share is verified against live sources.\n\n*How can I help you plan your trip today?*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [constraints, setConstraints] = useState({});
  const [toolCalls, setToolCalls] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    setInput("");

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

      const response = await fetch("http://localhost:8080/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          message: userMsgText,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }
        if (data.data.constraints) {
          setConstraints(data.data.constraints);
        }
        if (data.data.toolCallsUsed) {
          setToolCalls(data.data.toolCallsUsed);
        }

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          toolCalls: data.data.toolCallsUsed,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${data.message || "Something went wrong while connecting to the AI service."}\n\n*Note:* Make sure \`ANTHROPIC_API_KEY\` is configured in the backend \`.env\` file.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "❌ Could not connect to backend server at http://localhost:8080.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setInput(promptText);
  };

  return (
    <div className={styles.chatPageContainer}>
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarHeader}>
          <TravelExploreIcon className={styles.sidebarLogoIcon} />
          <h3>Trip Constraints</h3>
        </div>

        <div className={styles.constraintGroup}>
          <label>Destination</label>
          <div className={styles.constraintVal}>
            {constraints.destination || "Not specified"}
          </div>
        </div>

        <div className={styles.constraintGroup}>
          <label>Dates</label>
          <div className={styles.constraintVal}>
            {constraints.departureDate ? `${constraints.departureDate} → ${constraints.returnDate || "One way"}` : "Not specified"}
          </div>
        </div>

        <div className={styles.constraintGroup}>
          <label>Budget</label>
          <div className={styles.constraintVal}>
            {constraints.budgetTotal ? `${constraints.budgetTotal.currency} ${constraints.budgetTotal.amount}` : "Not specified"}
          </div>
        </div>

        <div className={styles.constraintGroup}>
          <label>Preferences</label>
          <div className={styles.constraintVal}>
            {constraints.dietaryRestrictions?.length > 0
              ? constraints.dietaryRestrictions.join(", ")
              : "Standard"}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.sidebarHeader}>
          <CheckCircleIcon className={styles.sidebarLogoIcon} />
          <h3>Live Data Audits</h3>
        </div>

        <div className={styles.toolCallList}>
          {toolCalls.length === 0 ? (
            <p className={styles.noAuditsText}>No API calls executed in this turn yet.</p>
          ) : (
            toolCalls.map((tc, idx) => (
              <div key={idx} className={styles.toolCallCard}>
                <div className={styles.toolCallHeader}>
                  <span className={styles.toolName}>{tc.tool}</span>
                  <span className={tc.status === "success" ? styles.statusBadgeSuccess : styles.statusBadgeError}>
                    {tc.status}
                  </span>
                </div>
                <div className={styles.toolCallDetails}>
                  <div>Provider: {tc.provider || "System"}</div>
                  <div>Latency: {tc.durationMs}ms</div>
                  <div>Fetched: {new Date(tc.retrievedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.chatMainArea}>
        <div className={styles.chatHeader}>
          <div className={styles.titleInfo}>
            <h2>
              <AutoAwesomeIcon className={styles.headerIcon} /> SkyNora AI Travel Agent
            </h2>
            <p>Powered by Real-Time APIs (Amadeus, Google Places, OpenWeatherMap, ExchangeRates)</p>
          </div>
          <div className={styles.provenanceBadge}>
            <span className={styles.dot}></span> No-Hallucination Verified
          </div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === "user" ? styles.userMsgRow : styles.assistantMsgRow}
            >
              <div className={msg.role === "user" ? styles.userBubble : styles.assistantBubble}>
                <div className={msg.role === "assistant" ? styles.markdownContent : ""}>
                  {msg.content}
                </div>
                <div className={styles.msgFooter}>
                  <span>{msg.timestamp}</span>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <span className={styles.sourcedTag}>
                      ✓ {msg.toolCalls.length} Live Data Source{msg.toolCalls.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className={styles.assistantMsgRow}>
              <div className={styles.assistantBubble}>
                <div className={styles.loadingPulse}>
                  <AutoAwesomeIcon className={styles.spinningIcon} />
                  <span>Thinking, searching live APIs & calculating costs...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.quickPrompts}>
          <button onClick={() => handleQuickPrompt("Plan a trip from Chennai to South Korea, budget ₹1 lakh, vegetarian food")}>
            <FlightIcon fontSize="small" /> Chennai → South Korea (₹1L Vegetarian)
          </button>
          <button onClick={() => handleQuickPrompt("Find 4-star hotels in Seoul with high rating for next month")}>
            <HotelIcon fontSize="small" /> 4-Star Hotels in Seoul
          </button>
          <button onClick={() => handleQuickPrompt("What is the weather forecast and exchange rate for KRW in Seoul?")}>
            <WbSunnyIcon fontSize="small" /> Weather & Exchange Rate
          </button>
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ask SkyNora AI to plan your trip, find flights, hotels, or check budget..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
};
