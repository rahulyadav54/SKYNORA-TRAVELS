import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "./AIChat.module.css";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import FlightIcon from "@mui/icons-material/Flight";
import HotelIcon from "@mui/icons-material/Hotel";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import EventNoteIcon from "@mui/icons-material/EventNote";
import HistoryIcon from "@mui/icons-material/History";
import { API_BASE_URL } from "../../config/api";
import { getValue } from "../../Utils/LocalStorage";
import { renderMarkdown } from "./utils/markdown";
import { ItineraryPanel } from "./components/ItineraryPanel";
import { BudgetPanel } from "./components/BudgetPanel";
import { SessionList } from "./components/SessionList";
import { MapPanel } from "./components/MapPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { DuringTripPanel } from "./components/DuringTripPanel";
import MapIcon from "@mui/icons-material/Map";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import DownloadIcon from "@mui/icons-material/Download";
import ExploreIcon from "@mui/icons-material/Explore";

const WELCOME_MSG = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 Welcome to **SkyNora AI Travel Agent**!\n\nI help you plan complete trips using live data tools (flights, hotels, weather, food, transport & budget).\n\n*Share your destination, dates, budget, and preferences — or tap a quick prompt below.*",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SIDEBAR_TABS = [
  { id: "plan", label: "Plan", icon: TravelExploreIcon },
  { id: "results", label: "Results", icon: CompareArrowsIcon },
  { id: "itinerary", label: "Days", icon: EventNoteIcon },
  { id: "budget", label: "Budget", icon: AccountBalanceWalletIcon },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "during", label: "Live", icon: ExploreIcon },
  { id: "sessions", label: "History", icon: HistoryIcon },
  { id: "audit", label: "Sources", icon: CheckCircleIcon },
];

export const AIChat = () => {
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [constraints, setConstraints] = useState({});
  const [toolCalls, setToolCalls] = useState([]);
  const [tripPlan, setTripPlan] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("plan");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const authHeaders = useCallback(() => {
    const token = getValue("userToken");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/sessions`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSessions(data.data || []);
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setSessionsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadSession = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/session/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) return;

      const doc = data.data;
      setSessionId(id);
      setConstraints(doc.constraints || {});
      setTripPlan(doc.tripPlan || null);
      setMessages(
        doc.messages?.length
          ? doc.messages.map((m) => ({
            ...m,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          }))
          : [WELCOME_MSG]
      );
      setToolCalls([]);
      setSidebarTab("plan");
    } catch (e) {
      console.error("Failed to load session", e);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([WELCOME_MSG]);
    setConstraints({});
    setTripPlan(null);
    setToolCalls([]);
    setSidebarTab("plan");
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`,
        });
      },
      () => alert("Could not get your location. Please allow location access.")
    );
  };

  const sendMessage = async (userMsgText) => {
    if (!userMsgText.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          message: userMsgText,
          sessionId,
          userLocation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.sessionId) setSessionId(data.data.sessionId);
        if (data.data.constraints) setConstraints(data.data.constraints);
        if (data.data.toolCallsUsed) setToolCalls(data.data.toolCallsUsed);
        if (data.data.tripPlan) setTripPlan(data.data.tripPlan);

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            toolCalls: data.data.toolCallsUsed,
          },
        ]);

        fetchSessions();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${data.message || "Something went wrong."}\n\n*Check GEMINI_API_KEY in backend .env and ensure you are logged in.*`,
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `❌ Could not connect to ${API_BASE_URL}. Is the backend running?`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  };

  const handleQuickAction = async (text) => {
    setInput(text);
    setSidebarTab("plan");
    await sendMessage(text);
  };

  const exportTripPlan = () => {
    const payload = { constraints, tripPlan, sessionId, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skynora-trip-${sessionId || "plan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasBookableItems = (tripPlan?.flights?.length || 0) + (tripPlan?.hotels?.length || 0) > 0;

  const dataTypeBadge = (provider) => {
    if (!provider) return { label: "System", className: styles.dataTypeEstimated };
    if (/mock/i.test(provider)) return { label: "Estimated (mock)", className: styles.dataTypeEstimated };
    if (/itinerary|calculation|skyNora/i.test(provider)) return { label: "AI recommended", className: styles.dataTypeAi };
    return { label: "Live", className: styles.dataTypeLive };
  };

  return (
    <div className={styles.chatPageContainer}>
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarTabs}>
          {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={sidebarTab === id ? styles.sidebarTabActive : styles.sidebarTab}
              onClick={() => setSidebarTab(id)}
            >
              <Icon fontSize="small" />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.sidebarContent}>
          {sidebarTab === "plan" && (
            <>
              <div className={styles.constraintGroup}>
                <label>Destination</label>
                <div className={styles.constraintVal}>{constraints.destination || "Not specified"}</div>
              </div>
              <div className={styles.constraintGroup}>
                <label>Dates</label>
                <div className={styles.constraintVal}>
                  {constraints.departureDate
                    ? `${constraints.departureDate} → ${constraints.returnDate || "One way"}`
                    : "Not specified"}
                </div>
              </div>
              <div className={styles.constraintGroup}>
                <label>Budget</label>
                <div className={styles.constraintVal}>
                  {constraints.budgetTotal
                    ? `${constraints.budgetTotal.currency} ${constraints.budgetTotal.amount}`
                    : "Not specified"}
                </div>
              </div>
              <div className={styles.constraintGroup}>
                <label>Preferences</label>
                <div className={styles.constraintVal}>
                  {constraints.dietaryRestrictions?.length
                    ? constraints.dietaryRestrictions.join(", ")
                    : "Standard"}
                </div>
              </div>
              <div className={styles.constraintGroup}>
                <label>Your location</label>
                <div className={styles.constraintVal}>
                  {userLocation
                    ? `📍 ${userLocation.label}`
                    : constraints.userLocation?.label || "Not shared"}
                </div>
              </div>
              {tripPlan && (
                <div className={styles.planStats}>
                  <span>✈️ {tripPlan.flights?.length || 0} flights</span>
                  <span>🏨 {tripPlan.hotels?.length || 0} hotels</span>
                  <span>📅 {tripPlan.itinerary?.length || 0} days</span>
                </div>
              )}
            </>
          )}

          {sidebarTab === "results" && (
            <ResultsPanel tripPlan={tripPlan} sessionId={sessionId} constraints={constraints} />
          )}
          {sidebarTab === "itinerary" && <ItineraryPanel tripPlan={tripPlan} />}
          {sidebarTab === "budget" && <BudgetPanel tripPlan={tripPlan} constraints={constraints} />}
          {sidebarTab === "map" && <MapPanel tripPlan={tripPlan} userLocation={userLocation || constraints.userLocation} />}
          {sidebarTab === "during" && (
            <DuringTripPanel
              sessionId={sessionId}
              tripPlan={tripPlan}
              constraints={constraints}
              userLocation={userLocation}
              authHeaders={authHeaders}
              onQuickAction={handleQuickAction}
              onRequestLocation={requestLocation}
            />
          )}
          {sidebarTab === "sessions" && (
            <SessionList
              sessions={sessions}
              activeSessionId={sessionId}
              onSelect={loadSession}
              onNewChat={startNewChat}
              loading={sessionsLoading}
            />
          )}
          {sidebarTab === "audit" && (
            <div className={styles.toolCallList}>
              {toolCalls.length === 0 ? (
                <p className={styles.emptyPanelText}>No API calls in the last turn.</p>
              ) : (
                toolCalls.map((tc, idx) => {
                  const badge = dataTypeBadge(tc.provider);
                  return (
                    <div key={idx} className={styles.toolCallCard}>
                      <div className={styles.toolCallHeader}>
                        <span className={styles.toolName}>{tc.tool}</span>
                        <span className={tc.status === "success" ? styles.statusBadgeSuccess : styles.statusBadgeError}>
                          {tc.status}
                        </span>
                      </div>
                      <div className={styles.toolCallDetails}>
                        <span className={badge.className}>{badge.label}</span>
                        <div>Provider: {tc.provider || "System"}</div>
                        <div>Latency: {tc.durationMs}ms</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.chatMainArea}>
        <div className={styles.chatHeader}>
          <div className={styles.titleInfo}>
            <h2><AutoAwesomeIcon className={styles.headerIcon} /> SkyNora AI Travel Agent</h2>
            <p>Gemini AI · Live tools · Route-optimized itineraries</p>
          </div>
          <div className={styles.headerActions}>
            {tripPlan && (
              <button type="button" className={styles.locationBtn} onClick={exportTripPlan} title="Download trip plan JSON">
                <DownloadIcon fontSize="small" /> Export
              </button>
            )}
            {hasBookableItems && (
              <Link to="/ai-travel/book" className={styles.bookLinkBtn} onClick={() => setSidebarTab("results")}>
                <ShoppingCartCheckoutIcon fontSize="small" /> Review & Book
              </Link>
            )}
            <button type="button" className={styles.locationBtn} onClick={requestLocation} title="Share location for nearby search">
              <MyLocationIcon fontSize="small" />
              {userLocation ? "Location on" : "Share location"}
            </button>
            <div className={styles.provenanceBadge}>
              <span className={styles.dot}></span> Source-verified
            </div>
          </div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg) => (
            <div key={msg.id} className={msg.role === "user" ? styles.userMsgRow : styles.assistantMsgRow}>
              <div className={msg.role === "user" ? styles.userBubble : styles.assistantBubble}>
                {msg.role === "assistant" ? (
                  <div
                    className={styles.markdownContent}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                ) : (
                  <div>{msg.content}</div>
                )}
                <div className={styles.msgFooter}>
                  <span>{msg.timestamp}</span>
                  {msg.toolCalls?.length > 0 && (
                    <span className={styles.sourcedTag}>✓ {msg.toolCalls.length} data source(s)</span>
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
                  <span>Searching live tools & building your plan...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.quickPrompts}>
          <button type="button" onClick={() => setInput("Plan a trip from Chennai to South Korea, Sep 15-22, budget ₹1 lakh, vegetarian, public transport")}>
            <FlightIcon fontSize="small" /> Chennai → Korea (₹1L)
          </button>
          <button type="button" onClick={() => setInput("What can I visit near Busan Station in the next 3 hours?")}>
            <WbSunnyIcon fontSize="small" /> 3 hours near Busan
          </button>
          <button type="button" onClick={() => setInput("Compare transport from Seoul Station to Gyeongbokgung Palace")}>
            <CompareArrowsIcon fontSize="small" /> Compare transport
          </button>
          <button type="button" onClick={() => setInput("Search flexible flights Chennai to Seoul around Sep 15 under ₹35000")}>
            <FlightIcon fontSize="small" /> Flexible flights
          </button>
          <button type="button" onClick={() => setInput("Check my flight status and adapt the plan if it's delayed")}>
            <FlightIcon fontSize="small" /> Flight status
          </button>
          <button type="button" onClick={() => setInput("It's raining — suggest indoor alternatives for today's itinerary")}>
            <WbSunnyIcon fontSize="small" /> Rain backup
          </button>
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Plan your trip, find flights, hotels, or ask for a budget breakdown..."
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
