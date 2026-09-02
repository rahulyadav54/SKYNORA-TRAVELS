/**
 * AI Travel Agent API Routes
 * POST /ai/chat    — main chat endpoint (auth required)
 * GET  /ai/session/:id  — retrieve session
 * DELETE /ai/session/:id — clear session
 * POST /ai/session/new — create new session
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Session = require("../models/Session");

// Lazy-load the TypeScript orchestrator (compiled to JS in dist/)
// Fallback to a stub if ANTHROPIC_API_KEY is not set.
let orchestratorInstance = null;
let providerRegistry = null;

function getOrchestrator() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!orchestratorInstance) {
    try {
      const { getProviderRegistry } = require("../dist/ai/providers/registry");
      const { TravelOrchestrator } = require("../dist/ai/orchestrator/orchestrator");
      providerRegistry = getProviderRegistry();
      orchestratorInstance = new TravelOrchestrator(providerRegistry);
    } catch (err) {
      console.error("[AI] Failed to load orchestrator:", err.message);
      return null;
    }
  }
  return orchestratorInstance;
}

function getOrchestratorDirect() {
  // When running with ts-node or if dist is not built, try direct require
  if (!orchestratorInstance) {
    try {
      require("ts-node/register");
      const { getProviderRegistry } = require("../ai/providers/registry.ts");
      const { TravelOrchestrator } = require("../ai/orchestrator/orchestrator.ts");
      providerRegistry = getProviderRegistry();
      orchestratorInstance = new TravelOrchestrator(providerRegistry);
    } catch {
      return null;
    }
  }
  return orchestratorInstance;
}

/**
 * POST /ai/chat
 * Body: { message: string, sessionId?: string }
 */
router.post("/chat", authMiddleware, async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: "message is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      success: false,
      message: "AI service is not configured. Please add ANTHROPIC_API_KEY to the server environment.",
      hint: "Add ANTHROPIC_API_KEY=your_key_here to backend/.env",
    });
  }

  try {
    // Load or create session
    let sessionDoc = null;
    let session = null;

    if (sessionId) {
      sessionDoc = await Session.findOne({ _id: sessionId, userId: req.user.id });
    }

    if (sessionDoc) {
      session = sessionDoc.toObject();
      session.id = sessionDoc._id.toString();
    } else {
      // Create fresh session
      const { createNewSession } = require("../ai/orchestrator/memory");
      session = createNewSession(req.user.id);
    }

    // Get orchestrator
    let orchestrator = getOrchestrator() || getOrchestratorDirect();
    if (!orchestrator) {
      return res.status(503).json({ success: false, message: "Failed to initialise AI orchestrator" });
    }

    // Run the chat
    const start = Date.now();
    const result = await orchestrator.chat(message.trim(), session);
    const durationMs = Date.now() - start;

    // Persist session to DB
    const updatedSession = result.session;
    if (sessionDoc) {
      await Session.findByIdAndUpdate(sessionDoc._id, {
        constraints: updatedSession.constraints,
        tripPlan: updatedSession.tripPlan,
        messages: updatedSession.messages,
        toolCallLog: updatedSession.toolCallLog,
        metadata: updatedSession.metadata,
      });
    } else {
      const newDoc = await Session.create({
        userId: req.user.id,
        constraints: updatedSession.constraints,
        tripPlan: updatedSession.tripPlan,
        messages: updatedSession.messages,
        toolCallLog: updatedSession.toolCallLog,
        metadata: updatedSession.metadata,
      });
      updatedSession.id = newDoc._id.toString();
    }

    return res.status(200).json({
      success: true,
      data: {
        message: result.message,
        sessionId: updatedSession.id || (sessionDoc?._id.toString()),
        toolCallsUsed: result.toolCallsUsed.map((t) => ({
          tool: t.toolName,
          provider: t.provider,
          status: t.status,
          retrievedAt: t.retrievedAt,
          durationMs: t.durationMs,
        })),
        constraints: updatedSession.constraints,
        durationMs,
      },
    });
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your request",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

/**
 * POST /ai/session/new — explicitly create a new session
 */
router.post("/session/new", authMiddleware, async (req, res) => {
  try {
    const doc = await Session.create({
      userId: req.user.id,
      constraints: {},
      messages: [],
      toolCallLog: [],
      metadata: { totalTokensUsed: 0, totalToolCalls: 0, status: "active" },
    });
    return res.status(201).json({ success: true, data: { sessionId: doc._id.toString() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to create session" });
  }
});

/**
 * GET /ai/session/:id — retrieve a session's state and history
 */
router.get("/session/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await Session.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ success: false, message: "Session not found" });
    return res.status(200).json({ success: true, data: doc.toObject() });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to retrieve session" });
  }
});

/**
 * GET /ai/sessions — list all sessions for the user
 */
router.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const docs = await Session.find({ userId: req.user.id })
      .select("_id metadata constraints createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20);
    return res.status(200).json({ success: true, data: docs });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to list sessions" });
  }
});

/**
 * DELETE /ai/session/:id — clear/abandon a session
 */
router.delete("/session/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { "metadata.status": "abandoned" },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Session not found" });
    return res.status(200).json({ success: true, message: "Session cleared" });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to clear session" });
  }
});

module.exports = router;
