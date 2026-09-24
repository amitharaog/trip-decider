import { currentPlan } from "@/lib/decide";
import { fail, handle, readJson, safeEqual } from "@/lib/http";
import { db } from "@/lib/supabase";
import { getConfirmations, getResponses, requireTrip } from "@/lib/trips";

export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/veto">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  const optionId = typeof body.optionId === "string" ? body.optionId : "";

  if (trip.status !== "deciding") fail(409, trip.status === "locked" ? "The trip is locked — no more vetoes" : "Options aren't open yet");
  const response = (await getResponses(trip.id)).find((r) => r.member_name === member);
  if (!response) fail(403, "Only people who submitted preferences get a veto");
  if (!safeEqual(response.member_token, req.headers.get("x-member-token"))) fail(403, "Use the phone you submitted from to veto");
  if ((await getConfirmations(trip.id)).some((c) => c.member_name === member)) fail(409, "You've already paid, so you're committed to the plan");

  const { data: vetoes, error: vErr } = await db().from("vetoes").select("member_name, option_id").eq("trip_id", trip.id);
  if (vErr) throw vErr;
  if (vetoes.some((v) => v.member_name === member)) fail(409, "You've already used your veto");
  const plan = currentPlan(trip.options, vetoes.map((v) => v.option_id));
  if (!plan || plan.id !== optionId) fail(409, "The plan has changed — refresh to see the new one");
  if (trip.options?.at(-1)?.id === plan.id) fail(409, "This is the last option, so it can't be vetoed");

  const { error } = await db().from("vetoes").insert({ trip_id: trip.id, member_name: member, option_id: optionId });
  if (error?.code === "23505") fail(409, "That veto is already used, or someone just vetoed this option — refresh");
  if (error) throw error;
  return Response.json({ ok: true });
});
