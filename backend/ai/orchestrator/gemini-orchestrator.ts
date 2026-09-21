/**
 * Gemini-powered Travel Orchestrator — same tool loop as Anthropic version.
 */

import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { GEMINI_TRAVEL_TOOLS } from "./gemini-tools";
import { SYSTEM_PROMPT } from "./prompts";
import { ToolExecutor } from "./tool-executor";
import {
  addMessageToSession, applyToolResultToSession, buildMessageHistory, logToolCall, updateConstraints,
} from "./memory";
import { extractConstraints } from "./intent";
import { ConversationSession, ToolCallRecord } from "../types/session";
import { ProviderRegistry } from "../providers/interfaces";
import { OrchestratorResponse } from "./orchestrator";

export class GeminiTravelOrchestrator {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private executor: ToolExecutor;

  constructor(providers: ProviderRegistry) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set — cannot initialise Gemini Travel Orchestrator");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    this.executor = new ToolExecutor(providers);
  }

  async chat(userMessage: string, session: ConversationSession): Promise<OrchestratorResponse> {
    let currentSession = updateConstraints(session, extractConstraints(userMessage));
    currentSession = addMessageToSession(currentSession, "user", userMessage);
    const toolCallsUsed: ToolCallRecord[] = [];

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: GEMINI_TRAVEL_TOOLS }],
    });

    const history = this.buildGeminiHistory(currentSession);
    const chat = model.startChat({ history });

    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    for (let round = 0; round < 8; round++) {
      const functionCalls = response.functionCalls();
      if (!functionCalls?.length) break;

      const functionResponses: Array<{ functionResponse: { name: string; response: object } }> = [];

      for (const call of functionCalls) {
        const toolName = call.name;
        const toolInput = (call.args ?? {}) as Record<string, unknown>;
        const startTime = Date.now();
        let toolOutput: unknown;
        let status: ToolCallRecord["status"] = "success";
        let errorMessage: string | undefined;

        try {
          toolOutput = await this.executor.execute(toolName, toolInput, currentSession);
        } catch (err: unknown) {
          status = "error";
          errorMessage = err instanceof Error ? err.message : String(err);
          toolOutput = {
            available: false,
            reason: errorMessage,
            attemptedAt: new Date().toISOString(),
          };
        }

        const durationMs = Date.now() - startTime;
        const outputObj = toolOutput as Record<string, unknown>;

        const record: ToolCallRecord = {
          id: `gemini_${toolName}_${Date.now()}_${round}`,
          toolName,
          input: toolInput,
          output: outputObj,
          provider: (outputObj?.label as Record<string, string>)?.source ?? undefined,
          retrievedAt: new Date().toISOString(),
          durationMs,
          status: outputObj?.available === false ? "unavailable" : status,
          errorMessage,
        };

        toolCallsUsed.push(record);
        currentSession = logToolCall(currentSession, record);
        currentSession = applyToolResultToSession(currentSession, toolName, toolOutput);

        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: outputObj as object,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const finalText = response.text() || "I couldn't generate a response. Please try again.";

    currentSession = addMessageToSession(currentSession, "assistant", finalText, toolCallsUsed);

    return {
      message: finalText,
      session: currentSession,
      toolCallsUsed,
    };
  }

  private buildGeminiHistory(session: ConversationSession): Content[] {
    const turns = buildMessageHistory(session);
    // Exclude the latest user message — it is sent via sendMessage()
    const prior = turns.slice(0, -1);

    return prior.map((turn) => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    }));
  }
}
