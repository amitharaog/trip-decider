import { handle, readJson } from "@/lib/http";
import { insertTrip } from "@/lib/trips";
import { parseNewTrip } from "@/lib/validate";

export const POST = handle(async (req) => {
  const trip = await insertTrip(parseNewTrip(await readJson(req)));
  return Response.json(trip, { status: 201 });
});
