/**
 * Session and conversation state types.
 * The session is the single source of truth for a conversation — never re-inferred from chat history.
 */

import { TripPlan, Constraint } from "./trip";

/** A single turn in the conversation */
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;  // ISO 8601
  toolCalls?: ToolCallRecord[];
}

/** Record of every tool invocation — proves data provenance */
export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  provider?: string;
  retrievedAt: string;  // ISO 8601 — when the external API was called
  durationMs: number;
  status: "success" | "error" | "unavailable";
  errorMessage?: string;
}

/** The full session state for one conversation */
export interface ConversationSession {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;

  /** Current extracted constraints — updated as user refines */
  constraints: Partial<Constraint>;

  /** The evolving trip plan */
  tripPlan?: TripPlan;

  /** Message history (capped at last 50 for context window management) */
  messages: ConversationMessage[];

  /** All tool calls made this session — for auditing data provenance */
  toolCallLog: ToolCallRecord[];

  /** Session-level metadata */
  metadata: {
    totalTokensUsed: number;
    totalToolCalls: number;
    lastAgentResponse?: string;
    status: "active" | "completed" | "abandoned";
  };
}

/** Minimal session snapshot stored in DB */
export interface SessionDocument {
  _id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  constraints: Partial<Constraint>;
  tripPlan?: TripPlan;
  messages: ConversationMessage[];
  toolCallLog: ToolCallRecord[];
  metadata: ConversationSession["metadata"];
}
