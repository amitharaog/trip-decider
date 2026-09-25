import { fail, handle, memberToken, readJson, safeEqual } from "@/lib/http";
import { db } from "@/lib/supabase";
import { getResponses, planFor, requireTrip } from "@/lib/trips";

export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/veto">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  const optionKey = typeof body.optionId === "string" ? body.optionId : "";

  if (trip.status === "collecting") fail(409, "Options aren't open yet");
  if (trip.status !== "deciding") fail(409, `${trip.organizer_name} has finalised the plan, so vetoes are closed`);
  const response = (await getResponses(trip.id)).find((r) => r.person_name === member);
  if (!response) fail(403, "Only people who submitted preferences get a veto");
  if (!safeEqual(memberToken(response.id), req.headers.get("x-member-token"))) fail(403, "Veto from the phone you submitted your answers on");

  const { vetoes, plan } = await planFor(trip);
  if (vetoes.some((v) => v.person_name === member)) fail(409, "You've already used your veto");
  if (!plan || plan.id !== optionKey) fail(409, "The plan has changed. Refresh to see the new one");
  if (trip.decision?.options.at(-1)?.id === plan.id) fail(409, "This is the last option, so it can't be vetoed");
  if (vetoes.some((v) => v.option_key === optionKey)) fail(409, "Someone just vetoed this option. Refresh");

  const { error } = await db().from("vetoes").insert({ trip_id: trip.id, person_name: member, option_key: optionKey });
  if (error?.code === "23505") fail(409, "You've already used your veto");
  if (error) throw error;
  return Response.json({ ok: true });
});
