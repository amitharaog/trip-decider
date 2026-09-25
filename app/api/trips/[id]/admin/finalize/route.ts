import { fail, handle } from "@/lib/http";
import { db } from "@/lib/supabase";
import { adminState, requireAdmin } from "@/lib/trips";

// Organizer fixes the current plan: vetoes close, payments open.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/admin/finalize">) => {
  const { id } = await ctx.params;
  const trip = await requireAdmin(id, req.headers.get("x-admin-token"));
  if (trip.status === "collecting") fail(409, "Show the options first");
  if (trip.status !== "deciding") fail(409, "The plan is already final");
  const { data, error } = await db()
    .from("trips")
    .update({ status: "confirming" })
    .eq("id", trip.id)
    .eq("status", "deciding") // a veto can't slip in between
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) fail(409, "The plan is already final");
  return Response.json(await adminState(data));
});
