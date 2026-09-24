import { fail, handle, newToken, readJson } from "@/lib/http";
import { db } from "@/lib/supabase";
import { requireTrip } from "@/lib/trips";
import { parseResponse } from "@/lib/validate";

// Insert-only: the unique (trip_id, member_name) constraint is what locks answers.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/responses">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  if (!trip.members.includes(member)) fail(400, "Pick your name first");
  if (trip.status !== "collecting") fail(409, "The organizer has closed collection — you're going with the group's pick");
  const r = parseResponse(body);
  const memberToken = newToken();
  const { error } = await db().from("responses").insert({
    trip_id: trip.id,
    member_name: member,
    member_token: memberToken,
    windows: r.windows,
    destination_types: r.destinationTypes,
    budget: r.budget,
    dealbreakers: r.dealbreakers,
  });
  if (error?.code === "23505") fail(409, `${member} has already submitted — answers are locked`);
  if (error) throw error;
  return Response.json({ memberToken }, { status: 201 });
});
