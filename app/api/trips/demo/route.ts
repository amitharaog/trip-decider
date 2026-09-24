import { createDemoTrip } from "@/lib/demo";
import { handle } from "@/lib/http";

export const POST = handle(async () => Response.json(await createDemoTrip(), { status: 201 }));
