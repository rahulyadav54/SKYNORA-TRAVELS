const mongoose = require("mongoose");

const ToolCallRecordSchema = new mongoose.Schema(
  {
    id: String,
    toolName: String,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    provider: String,
    retrievedAt: String,
    durationMs: Number,
    status: { type: String, enum: ["success", "error", "unavailable"] },
    errorMessage: String,
  },
  { _id: false }
);

const ConversationMessageSchema = new mongoose.Schema(
  {
    id: String,
    role: { type: String, enum: ["user", "assistant", "tool"] },
    content: String,
    timestamp: String,
    toolCalls: [ToolCallRecordSchema],
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    constraints: { type: mongoose.Schema.Types.Mixed, default: {} },
    tripPlan: { type: mongoose.Schema.Types.Mixed, default: null },
    messages: { type: [ConversationMessageSchema], default: [] },
    toolCallLog: { type: [ToolCallRecordSchema], default: [] },
    metadata: {
      totalTokensUsed: { type: Number, default: 0 },
      totalToolCalls: { type: Number, default: 0 },
      lastAgentResponse: String,
      status: { type: String, enum: ["active", "completed", "abandoned"], default: "active" },
    },
  },
  { versionKey: false, timestamps: true }
);

const Session = mongoose.model("session", SessionSchema);
module.exports = Session;
