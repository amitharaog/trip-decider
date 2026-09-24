import "server-only";
import { currentPlan } from "./decide";
import { fail, isUuid, memberToken, safeEqual } from "./http";
import { db } from "./supabase";
import type { ConfirmationRow, PublicTrip, ResponseRow, TripRow } from "./types";

export async function getTrip(id: string): Promise<TripRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db().from("trips").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as TripRow | null;
}

export async function requireTrip(id: string) {
  const trip = await getTrip(id);
  if (!trip) fail(404, "Trip not found");
  return trip;
}

export async function requireAdmin(id: string, token: string | null) {
  const trip = await requireTrip(id);
  if (!safeEqual(trip.admin_token, token)) fail(403, "This admin link isn't valid");
  return trip;
}

export async function getResponses(tripId: string): Promise<ResponseRow[]> {
  const { data, error } = await db()
    .from("responses")
    .select("id, person_name, date_windows, destination_types, budget_band, dealbreakers")
    .eq("trip_id", tripId)
    .order("submitted_at");
  if (error) throw error;
  return data as ResponseRow[];
}

export async function getVetoes(tripId: string) {
  const { data, error } = await db().from("vetoes").select("person_name, option_key").eq("trip_id", tripId);
  if (error) throw error;
  return data as { person_name: string; option_key: string }[];
}

export async function getConfirmations(tripId: string): Promise<ConfirmationRow[]> {
  const { data, error } = await db()
    .from("confirmations")
    .select("person_name, option_key, marked_paid_at, verified")
    .eq("trip_id", tripId)
    .order("marked_paid_at");
  if (error) throw error;
  return data as ConfirmationRow[];
}

/** The plan is the first option nobody vetoed. Vetoes stop once someone pays, so it can't move after that. */
export async function planFor(trip: TripRow) {
  const vetoes = await getVetoes(trip.id);
  return { vetoes, plan: currentPlan(trip.decision?.options ?? null, vetoes.map((v) => v.option_key)) };
}

export type NewTrip = {
  name: string;
  organizerName: string;
  members: string[];
  upiId: string;
  advanceAmount: number;
  minConfirmations: number;
};

export async function insertTrip(t: NewTrip) {
  // id and admin_token come from the column defaults.
  const { data, error } = await db()
    .from("trips")
    .insert({
      name: t.name,
      organizer_name: t.organizerName,
      members: t.members,
      upi_id: t.upiId,
      advance_amount: t.advanceAmount,
      min_confirmations: t.minConfirmations,
    })
    .select("id, admin_token")
    .single();
  if (error) throw error;
  return { id: data.id as string, adminToken: data.admin_token as string };
}

/**
 * Everything a group member may see. Budgets, dealbreakers, date ranges and
 * who used a veto are deliberately left out.
 */
export async function publicState(trip: TripRow, memberName?: string | null, token?: string | null): Promise<PublicTrip> {
  const [responses, { vetoes, plan }, confirmations] = await Promise.all([
    getResponses(trip.id),
    planFor(trip),
    getConfirmations(trip.id),
  ]);
  const options = trip.decision?.options ?? null;

  let me: PublicTrip["me"] = null;
  if (memberName && trip.members.includes(memberName)) {
    const response = responses.find((r) => r.person_name === memberName);
    const isMe = !!response && safeEqual(memberToken(response.id), token);
    const conf = confirmations.find((c) => c.person_name === memberName);
    const vetoUsed = isMe && vetoes.some((v) => v.person_name === memberName);
    const isLastOption = !!plan && options?.at(-1)?.id === plan.id;
    me = {
      name: memberName,
      submitted: !!response,
      vetoUsed,
      canVeto: trip.status === "deciding" && isMe && !vetoUsed && !!plan && !isLastOption,
      paid: !!conf,
      verified: !!conf?.verified,
    };
  }

  return {
    id: trip.id,
    name: trip.name,
    organizerName: trip.organizer_name,
    members: trip.members,
    status: trip.status,
    submitted: responses.map((r) => r.person_name),
    upiId: trip.upi_id,
    advanceAmount: trip.advance_amount,
    minConfirmations: trip.min_confirmations,
    dateWindow: trip.decision?.window ?? null,
    options,
    vetoedOptionIds: vetoes.map((v) => v.option_key),
    planId: plan?.id ?? null,
    paid: confirmations.map((c) => ({ member: c.person_name, verified: c.verified })),
    me,
  };
}

export type AdminState = PublicTrip & {
  adminToken: string;
  confirmations: ConfirmationRow[];
};

export async function adminState(trip: TripRow): Promise<AdminState> {
  const [pub, confirmations] = await Promise.all([publicState(trip), getConfirmations(trip.id)]);
  return { ...pub, adminToken: trip.admin_token, confirmations };
}
