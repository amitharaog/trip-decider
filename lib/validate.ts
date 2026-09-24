import "server-only";
import { HORIZON_DAYS, addDays, isValidDate, todayIST } from "./dates";
import { fail } from "./http";
import type { NewTrip } from "./trips";
import { BUDGETS, DEALBREAKERS, DESTINATION_TYPES, type Budget, type DateRange, type Dealbreaker, type DestinationType } from "./types";

function str(v: unknown, field: string, max = 80) {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  if (!s) fail(400, `${field} is required`);
  if (s.length > max) fail(400, `${field} is too long`);
  return s;
}

function int(v: unknown, field: string, min: number, max: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(400, `${field} must be between ${min} and ${max}`);
  return n;
}

export function parseNewTrip(body: Record<string, unknown>): NewTrip {
  const name = str(body.name, "Trip name");
  const organizerName = str(body.organizerName, "Your name", 40);
  const raw = Array.isArray(body.members) ? body.members : [];
  const members: string[] = [organizerName];
  for (const m of raw) {
    if (typeof m !== "string" || !m.trim()) continue;
    const clean = str(m, "Member name", 40);
    if (members.some((x) => x.toLowerCase() === clean.toLowerCase())) continue;
    members.push(clean);
  }
  if (members.length < 2) fail(400, "Add at least one friend");
  if (members.length > 20) fail(400, "Up to 20 people per trip");
  const upiId = str(body.upiId, "UPI ID", 60);
  if (!/^[\w.\-]{2,}@[a-zA-Z][\w.\-]*$/.test(upiId)) fail(400, "That doesn't look like a UPI ID (e.g. name@okhdfcbank)");
  const advanceAmount = int(body.advanceAmount ?? 2000, "Advance amount", 1, 100000);
  const minConfirmations = int(body.minConfirmations ?? 3, "Minimum confirmations", 1, members.length);
  return { name, organizerName, members, upiId, advanceAmount, minConfirmations };
}

export type NewResponse = {
  windows: DateRange[];
  destinationTypes: DestinationType[];
  budget: Budget;
  dealbreakers: Dealbreaker[];
};

function pick<T extends string>(v: unknown, allowed: readonly { id: T }[]): T[] {
  if (!Array.isArray(v)) return [];
  const ids = allowed.map((a) => a.id);
  return [...new Set(v.filter((x): x is T => ids.includes(x as T)))];
}

export function parseResponse(body: Record<string, unknown>): NewResponse {
  const today = todayIST();
  const last = addDays(today, HORIZON_DAYS);
  const rawWindows = Array.isArray(body.windows) ? body.windows : [];
  if (rawWindows.length === 0) fail(400, "Add at least one date range");
  if (rawWindows.length > 8) fail(400, "Up to 8 date ranges");
  const windows = rawWindows.map((w: { start?: unknown; end?: unknown }) => {
    if (!isValidDate(w?.start) || !isValidDate(w?.end)) fail(400, "Every date range needs a start and an end");
    if (w.start > w.end) fail(400, "A date range ends before it starts");
    if (w.end < today || w.start > last) fail(400, "Date ranges must be within the next 3 months");
    return { start: w.start < today ? today : w.start, end: w.end > last ? last : w.end };
  });

  const destinationTypes = pick(body.destinationTypes, DESTINATION_TYPES);
  if (destinationTypes.length === 0) fail(400, "Pick at least one kind of place");
  const budget = BUDGETS.find((b) => b.id === body.budget)?.id;
  if (!budget) fail(400, "Pick a budget");
  const dealbreakers = pick(body.dealbreakers, DEALBREAKERS);
  return { windows, destinationTypes, budget, dealbreakers };
}
