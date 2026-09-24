import { decide } from "@/lib/decide";
import { fail, handle } from "@/lib/http";
import { db } from "@/lib/supabase";
import { adminState, getResponses, requireAdmin } from "@/lib/trips";

// Close collection: compute the date window and options once, and freeze them.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/admin/close">) => {
  const { id } = await ctx.params;
  const trip = await requireAdmin(id, req.headers.get("x-admin-token"));
  if (trip.status !== "collecting") fail(409, "Collection is already closed");
  const responses = await getResponses(trip.id);
  if (responses.length < 2) fail(409, "Wait for at least 2 people to submit");

  const { window, options } = decide(trip.members, responses);
  if (!window) fail(409, "Nobody's dates leave room for a 3-day trip in the next 3 months");
  if (options.length === 0) fail(409, "Every destination hits someone's dealbreaker — ask people to loosen up");

  const { data, error } = await db()
    .from("trips")
    .update({ status: "deciding", date_window: window, options, decided_at: new Date().toISOString() })
    .eq("id", trip.id)
    .eq("status", "collecting") // guard against a double click
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) fail(409, "Collection is already closed");
  return Response.json(await adminState(data));
});
