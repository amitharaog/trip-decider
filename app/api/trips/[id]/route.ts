import { handle } from "@/lib/http";
import { publicState, requireTrip } from "@/lib/trips";

// GET /api/trips/:id?member=Name  (header x-member-token for the member's own veto state)
export const GET = handle(async (req, ctx: RouteContext<"/api/trips/[id]">) => {
  const { id } = await ctx.params;
  const trip = await requireTrip(id);
  const member = new URL(req.url).searchParams.get("member");
  return Response.json(await publicState(trip, member, req.headers.get("x-member-token")));
});
