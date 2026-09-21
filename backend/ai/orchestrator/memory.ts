/**
 * Orchestrator Memory — manages the serialisable TripPlan and session state.
 */

import { ConversationSession, ToolCallRecord, ConversationMessage } from "../types/session";
import { Constraint, TripPlan, DayPlan, BudgetSummary, FlightOption, HotelOption } from "../types/trip";
import { isDataUnavailable } from "../types/results";
import { extractMapPins } from "./map-pins";

export function createNewSession(userId: string): ConversationSession {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  return {
    id,
    userId,
    createdAt: now,
    updatedAt: now,
    constraints: {},
    messages: [],
    toolCallLog: [],
    metadata: {
      totalTokensUsed: 0,
      totalToolCalls: 0,
      status: "active",
    },
  };
}

export function addMessageToSession(
  session: ConversationSession,
  role: ConversationMessage["role"],
  content: string,
  toolCalls?: ToolCallRecord[]
): ConversationSession {
  const msg: ConversationMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    toolCalls,
  };
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    messages: [...session.messages.slice(-49), msg], // keep last 50
  };
}

export function updateConstraints(
  session: ConversationSession,
  partial: Partial<Constraint>
): ConversationSession {
  const constraints = { ...session.constraints, ...partial };
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    constraints,
    tripPlan: session.tripPlan
      ? { ...session.tripPlan, constraints, updatedAt: new Date().toISOString(), status: "modified" }
      : createTripPlan(session, constraints),
  };
}

function createTripPlan(session: ConversationSession, constraints: Partial<Constraint>): TripPlan {
  const now = new Date().toISOString();
  return { id: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, userId: session.userId, sessionId: session.id, createdAt: now, updatedAt: now, constraints, flights: [], hotels: [], itinerary: [], status: "planning" };
}

export function logToolCall(
  session: ConversationSession,
  record: ToolCallRecord
): ConversationSession {
  return {
    ...session,
    toolCallLog: [...session.toolCallLog, record],
    metadata: {
      ...session.metadata,
      totalToolCalls: session.metadata.totalToolCalls + 1,
    },
  };
}

/** Build the Anthropic-format message history from session messages */
export function buildMessageHistory(
  session: ConversationSession
): Array<{ role: "user" | "assistant"; content: string }> {
  return session.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20) // last 20 turns for context window management
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

/** Merge successful tool outputs into the session trip plan */
export function applyToolResultToSession(
  session: ConversationSession,
  toolName: string,
  output: unknown
): ConversationSession {
  if (isDataUnavailable(output)) return session;

  const now = new Date().toISOString();
  const tripPlan = session.tripPlan ?? createTripPlan(session, session.constraints);
  const result = output as Record<string, unknown>;

  switch (toolName) {
    case "search_flights":
      if (Array.isArray(result.flights)) {
        tripPlan.flights = result.flights as FlightOption[];
      }
      break;
    case "search_hotels":
      if (Array.isArray(result.hotels)) {
        tripPlan.hotels = result.hotels as HotelOption[];
      }
      break;
    case "build_itinerary":
    case "adapt_itinerary":
      if (Array.isArray(result.days)) {
        tripPlan.itinerary = result.days as DayPlan[];
        tripPlan.status = "modified";
      }
      break;
    case "calculate_budget":
      if (result.breakdown) {
        tripPlan.budgetSummary = {
          totalBudget: result.totalBudget as BudgetSummary["totalBudget"],
          breakdown: result.breakdown as BudgetSummary["breakdown"],
          totalSpent: result.totalEstimated as BudgetSummary["totalSpent"],
          remaining: result.remaining as BudgetSummary["remaining"],
          perPersonPerDay: result.perPersonPerDay as BudgetSummary["perPersonPerDay"],
          label: result.label as BudgetSummary["label"],
        };
      }
      break;
    default:
      break;
  }

  const mapPins = extractMapPins(session, tripPlan);

  return {
    ...session,
    tripPlan: {
      ...tripPlan,
      mapPins,
      updatedAt: now,
      status: tripPlan.status === "complete" ? "complete" : "modified",
    },
    updatedAt: now,
  };
}
