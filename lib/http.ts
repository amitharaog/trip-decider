import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handle<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {}
  fail(400, "Invalid request body");
}

export function safeEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string) {
  return UUID.test(s);
}

/**
 * The token a member's phone gets after submitting, used to prove "I'm the
 * person who submitted" when vetoing. Derived from the response's private id
 * (never sent to the group) so it needs no extra column.
 */
export function memberToken(responseId: string) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY must be set");
  return createHmac("sha256", key).update(`trip-decider:member:${responseId}`).digest("base64url");
}
