import { fail, handle, readJson } from "@/lib/http";
import { db } from "@/lib/supabase";
import { planFor, requireTrip } from "@/lib/trips";

// "I've paid" records a payment for the plan. Payments only open once the
// organizer has finalised the plan, so the plan can't change after someone pays.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/paid">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  if (!trip.members.includes(member)) fail(400, "Pick your name first");
  if (trip.status === "collecting" || trip.status === "deciding")
    fail(409, `Payments open once ${trip.organizer_name} finalises the plan`);
  const { plan } = await planFor(trip);
  if (!plan) fail(409, "There's no plan to pay for yet");

  const { error } = await db().from("confirmations").insert({ trip_id: trip.id, person_name: member, option_key: plan.id });
  if (error && error.code !== "23505") throw error; // already marked paid is fine

  return Response.json({ ok: true });
});
