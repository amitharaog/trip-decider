import "server-only";
import { addDays, todayIST } from "./dates";
import { newToken } from "./http";
import { db } from "./supabase";
import { insertTrip } from "./trips";

/**
 * Riya organizes; four friends have answered and Preethi hasn't yet, so a
 * reviewer can fill in her form, then close collection from the admin link.
 */
export async function createDemoTrip() {
  const today = todayIST();
  // First Friday at least 3 weeks out, and the one 3 weeks after that.
  let f1 = addDays(today, 21);
  while (new Date(Date.parse(f1)).getUTCDay() !== 5) f1 = addDays(f1, 1);
  const f2 = addDays(f1, 21);
  const r = (from: string, a: number, b: number) => ({ start: addDays(from, a), end: addDays(from, b) });

  const trip = await insertTrip({
    name: "Finally, the long weekend",
    organizerName: "Riya",
    members: ["Riya", "Siddharth", "Karan", "Aisha", "Preethi"],
    upiId: "riya.demo@okaxis",
    advanceAmount: 2000,
    minConfirmations: 3,
  });

  const responses = [
    { member_name: "Riya", windows: [r(f1, -1, 3), r(f2, 0, 3)], destination_types: ["beach", "nature"], budget: "8to15k", dealbreakers: ["party"] },
    { member_name: "Siddharth", windows: [r(f1, 0, 2), r(f2, -1, 3)], destination_types: ["mountains", "nature"], budget: "15to25k", dealbreakers: ["flights"] },
    { member_name: "Karan", windows: [r(f2, 0, 3)], destination_types: ["beach", "heritage"], budget: "8to15k", dealbreakers: ["longTravel"] },
    { member_name: "Aisha", windows: [r(f1, 0, 2), r(f2, 0, 2)], destination_types: ["nature", "heritage"], budget: "under8k", dealbreakers: ["trekking", "cold"] },
  ].map((x) => ({ ...x, trip_id: trip.id, member_token: newToken() }));

  const { error } = await db().from("responses").insert(responses);
  if (error) throw error;
  return trip;
}
