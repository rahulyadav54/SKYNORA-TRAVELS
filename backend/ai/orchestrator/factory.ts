/**
 * Creates the active travel orchestrator (Gemini preferred, Anthropic fallback).
 */

import { ProviderRegistry } from "../providers/interfaces";
import { TravelOrchestrator, OrchestratorResponse } from "./orchestrator";
import { GeminiTravelOrchestrator } from "./gemini-orchestrator";
import { ConversationSession } from "../types/session";

export interface TravelOrchestratorLike {
  chat(userMessage: string, session: ConversationSession): Promise<OrchestratorResponse>;
}

export function createTravelOrchestrator(providers: ProviderRegistry): TravelOrchestratorLike {
  if (process.env.GEMINI_API_KEY) {
    console.log("[AI] Using Gemini orchestrator");
    return new GeminiTravelOrchestrator(providers);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("[AI] Using Anthropic orchestrator");
    return new TravelOrchestrator(providers);
  }
  throw new Error("Set GEMINI_API_KEY or ANTHROPIC_API_KEY in backend/.env");
}

export function hasAiProviderConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
