/**
 * Anthropic-powered Travel Orchestrator.
 */

import Anthropic from "@anthropic-ai/sdk";
import { TRAVEL_TOOLS } from "./tools";
import { SYSTEM_PROMPT } from "./prompts";
import { ToolExecutor } from "./tool-executor";
import {
  addMessageToSession, applyToolResultToSession, buildMessageHistory, logToolCall, updateConstraints,
} from "./memory";
import { extractConstraints } from "./intent";
import { ConversationSession, ToolCallRecord } from "../types/session";
import { ProviderRegistry } from "../providers/interfaces";

export interface OrchestratorResponse {
  message: string;
  session: ConversationSession;
  toolCallsUsed: ToolCallRecord[];
}

export class TravelOrchestrator {
  private client: Anthropic;
  private executor: ToolExecutor;

  constructor(providers: ProviderRegistry) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set — cannot initialise Travel Orchestrator");
    }
    this.client = new Anthropic({ apiKey });
    this.executor = new ToolExecutor(providers);
  }

  async chat(
    userMessage: string,
    session: ConversationSession
  ): Promise<OrchestratorResponse> {
    let currentSession = updateConstraints(session, extractConstraints(userMessage));
    currentSession = addMessageToSession(currentSession, "user", userMessage);
    const toolCallsUsed: ToolCallRecord[] = [];

    const messages = buildMessageHistory(currentSession);

    let response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TRAVEL_TOOLS,
      messages,
    });

    while (response.stop_reason === "tool_use") {
      const assistantMessage: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content,
      };

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const startTime = Date.now();
        let toolOutput: unknown;
        let status: ToolCallRecord["status"] = "success";
        let errorMessage: string | undefined;

        try {
          toolOutput = await this.executor.execute(block.name, block.input as Record<string, unknown>, currentSession);
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
          id: block.id,
          toolName: block.name,
          input: block.input as Record<string, unknown>,
          output: outputObj,
          provider: (outputObj?.label as Record<string, string>)?.source ?? undefined,
          retrievedAt: new Date().toISOString(),
          durationMs,
          status: outputObj?.available === false ? "unavailable" : status,
          errorMessage,
        };

        toolCallsUsed.push(record);
        currentSession = logToolCall(currentSession, record);
        currentSession = applyToolResultToSession(currentSession, block.name, toolOutput);

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(toolOutput),
        });
      }

      const updatedMessages: Anthropic.MessageParam[] = [
        ...messages,
        assistantMessage,
        { role: "user", content: toolResults },
      ];

      response = await this.client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TRAVEL_TOOLS,
        messages: updatedMessages,
      });
    }

    const finalText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n");

    currentSession = addMessageToSession(currentSession, "assistant", finalText, toolCallsUsed);

    return {
      message: finalText,
      session: currentSession,
      toolCallsUsed,
    };
  }
}
