import { handle } from "@/lib/http";
import { adminState, requireAdmin } from "@/lib/trips";

export const GET = handle(async (req, ctx: RouteContext<"/api/trips/[id]/admin">) => {
  const { id } = await ctx.params;
  const trip = await requireAdmin(id, req.headers.get("x-admin-token"));
  return Response.json(await adminState(trip));
});
