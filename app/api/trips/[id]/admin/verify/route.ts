import { fail, handle, readJson } from "@/lib/http";
import { db } from "@/lib/supabase";
import { adminState, getConfirmations, planFor, requireAdmin } from "@/lib/trips";

// Mark a payment verified; lock the trip once enough are verified for the plan.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/admin/verify">) => {
  const { id } = await ctx.params;
  let trip = await requireAdmin(id, req.headers.get("x-admin-token"));
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  if (trip.status === "collecting") fail(409, "Show the options first");

  const { data: updated, error } = await db()
    .from("confirmations")
    .update({ verified: true })
    .eq("trip_id", trip.id)
    .eq("person_name", member)
    .select("person_name");
  if (error) throw error;
  if (!updated?.length) fail(404, `${member} hasn't marked themselves as paid`);

  const [{ plan }, confirmations] = await Promise.all([planFor(trip), getConfirmations(trip.id)]);
  const verified = confirmations.filter((c) => c.verified && c.option_key === plan?.id).length;
  if (trip.status !== "locked" && verified >= trip.min_confirmations) {
    const { data, error: lockErr } = await db().from("trips").update({ status: "locked" }).eq("id", trip.id).select("*").single();
    if (lockErr) throw lockErr;
    trip = data;
  }
  return Response.json(await adminState(trip));
});
