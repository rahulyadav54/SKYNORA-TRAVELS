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



let orchestratorInstance = null;

let providerRegistry = null;



function loadFactory() {

  try {

    return require("../dist/ai/orchestrator/factory");

  } catch {

    try {

      require("ts-node/register");

      return require("../ai/orchestrator/factory.ts");

    } catch {

      return null;

    }

  }

}



function getOrchestrator() {

  const factory = loadFactory();

  if (!factory?.hasAiProviderConfigured()) {

    return null;

  }

  if (!orchestratorInstance) {

    try {

      const { getProviderRegistry } = require("../dist/ai/providers/registry");

      const { createTravelOrchestrator } = factory;

      providerRegistry = getProviderRegistry();

      orchestratorInstance = createTravelOrchestrator(providerRegistry);

    } catch (err) {

      console.error("[AI] Failed to load orchestrator:", err.message);

      return null;

    }

  }

  return orchestratorInstance;

}



function getOrchestratorDirect() {

  const factory = loadFactory();

  if (!factory?.hasAiProviderConfigured()) {

    return null;

  }

  if (!orchestratorInstance) {

    try {

      require("ts-node/register");

      const { getProviderRegistry } = require("../ai/providers/registry.ts");

      const { createTravelOrchestrator } = factory;

      providerRegistry = getProviderRegistry();

      orchestratorInstance = createTravelOrchestrator(providerRegistry);

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

  const { message, sessionId, userLocation } = req.body;



  if (!message || typeof message !== "string" || message.trim().length === 0) {

    return res.status(400).json({ success: false, message: "message is required" });

  }



  const factory = loadFactory();

  if (!factory?.hasAiProviderConfigured()) {

    return res.status(503).json({

      success: false,

      message: "AI service is not configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to backend/.env",

      hint: "GEMINI_API_KEY=your_key_here (recommended)",

    });

  }



  try {

    let sessionDoc = null;

    let session = null;



    if (sessionId) {

      sessionDoc = await Session.findOne({ _id: sessionId, userId: req.user.id });

    }



    if (sessionDoc) {

      session = sessionDoc.toObject();

      session.id = sessionDoc._id.toString();

    } else {

      const { createNewSession } = require("../ai/orchestrator/memory");

      session = createNewSession(req.user.id);

    }



    if (userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number") {

      session.constraints = {

        ...session.constraints,

        userLocation: {

          lat: userLocation.lat,

          lng: userLocation.lng,

          label: userLocation.label || `${userLocation.lat},${userLocation.lng}`,

        },

      };

    }



    const orchestrator = getOrchestrator() || getOrchestratorDirect();

    if (!orchestrator) {

      return res.status(503).json({ success: false, message: "Failed to initialise AI orchestrator" });

    }



    const start = Date.now();

    const result = await orchestrator.chat(message.trim(), session);

    const durationMs = Date.now() - start;



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

        tripPlan: updatedSession.tripPlan,

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



router.get("/session/:id", authMiddleware, async (req, res) => {

  try {

    const doc = await Session.findOne({ _id: req.params.id, userId: req.user.id });

    if (!doc) return res.status(404).json({ success: false, message: "Session not found" });

    return res.status(200).json({ success: true, data: doc.toObject() });

  } catch {

    return res.status(500).json({ success: false, message: "Failed to retrieve session" });

  }

});



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



router.get("/trip-status", authMiddleware, async (req, res) => {

  const { sessionId } = req.query;

  if (!sessionId) {

    return res.status(400).json({ success: false, message: "sessionId query param is required" });

  }



  try {

    const doc = await Session.findOne({ _id: sessionId, userId: req.user.id });

    if (!doc) return res.status(404).json({ success: false, message: "Session not found" });



    const session = doc.toObject();

    session.id = doc._id.toString();



    const orchestrator = getOrchestrator() || getOrchestratorDirect();

    if (!orchestrator) {

      return res.status(503).json({ success: false, message: "AI service not configured" });

    }



    let registry = providerRegistry;

    if (!registry) {

      try {

        const { getProviderRegistry } = require("../dist/ai/providers/registry");

        registry = getProviderRegistry();

      } catch {

        const { getProviderRegistry } = require("../ai/providers/registry.ts");

        registry = getProviderRegistry();

      }

    }



    const { buildTripStatus } = require("../dist/ai/engine/trip-status");

    const snapshot = await buildTripStatus(session, registry);



    return res.status(200).json({ success: true, data: snapshot });

  } catch (err) {

    console.error("[AI Trip Status] Error:", err);

    return res.status(500).json({ success: false, message: "Failed to load trip status" });

  }

});



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


