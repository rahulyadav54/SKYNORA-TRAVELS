/**
 * Adapt itinerary — swaps outdoor activities for indoor alternatives on bad weather,
 * substitutes closed venues, and shifts plans after flight delays.
 */

import { ItineraryDay, ItineraryAgentResult, Attraction } from "../types/results";
import { DataLabel } from "../types/trip";

export type AdaptReason = "heavy_rain" | "extreme_heat" | "closure" | "flight_delay" | "other";

export interface AdaptItineraryInput {
  days: ItineraryDay[];
  reason: AdaptReason;
  affectedDate?: string;
  closedVenueNames?: string[];
  indoorAlternatives?: Attraction[];
  delayHours?: number;
  notes?: string;
}

export interface ItineraryChange {
  dayNumber: number;
  date: string;
  changeType: "swapped" | "removed" | "shifted" | "added_note";
  original?: string;
  replacement?: string;
  message: string;
}

export interface AdaptItineraryResult {
  available: true;
  label: DataLabel;
  days: ItineraryDay[];
  totalDays: number;
  changes: ItineraryChange[];
  adaptationReason: AdaptReason;
  summary: string;
}

const OUTDOOR_CATEGORIES = new Set(["park", "nature", "landmark", "beach", "hiking", "outdoor"]);
const INDOOR_CATEGORIES = new Set(["museum", "shopping", "culture", "temple", "entertainment"]);

function isOutdoorActivity(activity: ItineraryDay["activities"][0]): boolean {
  const text = `${activity.name} ${activity.description}`.toLowerCase();
  return OUTDOOR_CATEGORIES.has(activity.description?.toLowerCase() || "")
    || /park|garden|beach|hike|outdoor|trail|zoo/i.test(text);
}

function pickIndoorAlternative(
  alternatives: Attraction[],
  used: Set<string>
): Attraction | undefined {
  const indoor = alternatives.filter(
    (a) => INDOOR_CATEGORIES.has(a.category?.toLowerCase() || "") && !used.has(a.id)
  );
  const fallback = alternatives.filter((a) => !used.has(a.id));
  return indoor[0] || fallback[0];
}

export class AdaptItineraryAgent {
  adapt(input: AdaptItineraryInput): ItineraryAgentResult | AdaptItineraryResult {
    if (!input.days?.length) {
      return {
        available: false,
        reason: "No itinerary days to adapt. Build an itinerary first with build_itinerary.",
        provider: "AdaptItineraryAgent",
        attemptedAt: new Date().toISOString(),
      };
    }

    const label: DataLabel = {
      dataType: "ai_recommended",
      source: "SkyNora itinerary adapter (weather/closure aware)",
      retrievedAt: new Date().toISOString(),
    };

    const changes: ItineraryChange[] = [];
    const usedAlternatives = new Set<string>();
    const alternatives = input.indoorAlternatives || [];
    const closedNames = (input.closedVenueNames || []).map((n) => n.toLowerCase());
    const weatherReasons = new Set<AdaptReason>(["heavy_rain", "extreme_heat"]);

    const days = input.days.map((day) => {
      if (input.affectedDate && day.date !== input.affectedDate) return day;

      const dayNumber = day.dayNumber;
      let activities = [...(day.activities || [])];
      let notes = day.notes || "";

      if (input.reason === "flight_delay" && input.delayHours) {
        const shift = Math.min(4, Math.round(input.delayHours));
        activities = activities.map((act) => {
          const [h, m] = (act.time || "10:00").split(":").map(Number);
          const newH = Math.min(21, h + shift);
          changes.push({
            dayNumber,
            date: day.date,
            changeType: "shifted",
            original: act.time,
            replacement: `${String(newH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`,
            message: `Shifted "${act.name}" by ${shift}h due to flight delay`,
          });
          return { ...act, time: `${String(newH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}` };
        });
        notes += ` Flight delay buffer: +${shift}h applied.`;
      }

      if (weatherReasons.has(input.reason)) {
        activities = activities.map((act) => {
          if (!isOutdoorActivity(act)) return act;
          const alt = pickIndoorAlternative(alternatives, usedAlternatives);
          if (!alt) {
            changes.push({
              dayNumber,
              date: day.date,
              changeType: "added_note",
              original: act.name,
              message: `Outdoor activity "${act.name}" flagged — consider indoor backup (no alternatives in session)`,
            });
            return act;
          }
          usedAlternatives.add(alt.id);
          changes.push({
            dayNumber,
            date: day.date,
            changeType: "swapped",
            original: act.name,
            replacement: alt.name,
            message: `Replaced outdoor "${act.name}" with indoor "${alt.name}" due to ${input.reason.replace("_", " ")}`,
          });
          return {
            ...act,
            id: alt.id,
            name: alt.name,
            description: alt.description || act.description,
            address: alt.address || act.address,
            label: alt.label,
            tips: `Indoor alternative for ${input.reason.replace("_", " ")}`,
          };
        });
      }

      if (input.reason === "closure" && closedNames.length) {
        activities = activities.flatMap((act) => {
          const isClosed = closedNames.some((n) => act.name.toLowerCase().includes(n));
          if (!isClosed) return [act];
          const alt = pickIndoorAlternative(alternatives, usedAlternatives);
          if (!alt) {
            changes.push({
              dayNumber,
              date: day.date,
              changeType: "removed",
              original: act.name,
              message: `"${act.name}" is closed — no substitute found in session data`,
            });
            return [];
          }
          usedAlternatives.add(alt.id);
          changes.push({
            dayNumber,
            date: day.date,
            changeType: "swapped",
            original: act.name,
            replacement: alt.name,
            message: `Closed venue "${act.name}" replaced with "${alt.name}"`,
          });
          return [{
            ...act,
            id: alt.id,
            name: alt.name,
            description: alt.description || act.description,
            address: alt.address || act.address,
            label: alt.label,
          }];
        });
      }

      if (input.notes) {
        notes += ` ${input.notes}`;
        changes.push({
          dayNumber,
          date: day.date,
          changeType: "added_note",
          message: input.notes,
        });
      }

      return { ...day, activities, notes: notes.trim() || undefined };
    });

    const reasonLabel = input.reason.replace(/_/g, " ");
    const summary = changes.length
      ? `Adapted ${changes.length} item(s) for ${reasonLabel}.`
      : `No changes needed for ${reasonLabel} on the selected day(s).`;

    const currency = input.days[0]?.estimatedCost?.currency || "INR";
    const totalAmount = days.reduce((sum, d) => sum + (d.estimatedCost?.amount || 0), 0);

    return {
      available: true,
      label,
      days,
      totalDays: days.length,
      changes,
      adaptationReason: input.reason,
      summary,
      totalEstimatedCost: { amount: totalAmount, currency },
      optimizationNote: summary,
    };
  }
}
