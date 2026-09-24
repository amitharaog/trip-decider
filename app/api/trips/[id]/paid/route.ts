import { fail, handle, readJson } from "@/lib/http";
import { db } from "@/lib/supabase";
import { requireTrip } from "@/lib/trips";

export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/paid">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  if (!trip.members.includes(member)) fail(400, "Pick your name first");
  if (trip.status === "collecting") fail(409, "Payments open once the organizer shows the options");
  const { error } = await db().from("confirmations").insert({ trip_id: trip.id, member_name: member });
  if (error && error.code !== "23505") throw error; // already claimed is fine
  return Response.json({ ok: true });
});
