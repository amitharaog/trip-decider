import { fail, handle, memberToken, readJson } from "@/lib/http";
import { db } from "@/lib/supabase";
import { requireTrip } from "@/lib/trips";
import { parseResponse } from "@/lib/validate";

// Insert-only: the unique (trip_id, person_name) constraint is what locks answers.
export const POST = handle(async (req, ctx: RouteContext<"/api/trips/[id]/responses">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const body = await readJson(req);
  const member = typeof body.member === "string" ? body.member : "";
  if (!trip.members.includes(member)) fail(400, "Pick your name first");
  if (trip.status !== "collecting") fail(409, "The organizer has closed collection. You're going with the group's pick");
  const r = parseResponse(body);
  const { data, error } = await db()
    .from("responses")
    .insert({
      trip_id: trip.id,
      person_name: member,
      date_windows: r.windows,
      destination_types: r.destinationTypes,
      budget_band: r.budget,
      dealbreakers: r.dealbreakers,
    })
    .select("id")
    .single();
  if (error?.code === "23505") fail(409, `${member} has already submitted. Answers are locked`);
  if (error) throw error;
  return Response.json({ memberToken: memberToken(data.id) }, { status: 201 });
});
