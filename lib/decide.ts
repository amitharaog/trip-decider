import { bestWindow } from "./dates";
import { DESTINATIONS, costLabel, travelLabel, type Destination } from "./destinations";
import { BUDGETS, type DateWindow, type Fit, type MemberFit, type ResponseRow, type TripOption } from "./types";

export const MAX_TRAVEL_HOURS = 8;
const TOP_N = 3;

function hitsDealbreaker(d: Destination, r: ResponseRow) {
  return r.dealbreakers.some((db) => {
    switch (db) {
      case "longTravel": return d.travelHours > MAX_TRAVEL_HOURS;
      case "flights": return d.flight;
      case "trekking": return d.tags.includes("trekking");
      case "party": return d.tags.includes("party");
      case "cold": return d.tags.includes("cold");
    }
  });
}

function budgetFit(d: Destination, r: ResponseRow): Fit {
  const cap = BUDGETS.find((b) => b.id === r.budget_band)?.cap ?? 0;
  if (d.cost[1] <= cap) return "works"; // even the pricier end fits
  if (d.cost[0] <= cap) return "stretch"; // only doable at the cheap end
  return "no";
}

function typeMatches(d: Destination, r: ResponseRow) {
  return r.destination_types.includes(d.type);
}

const RANK: Record<Fit, number> = { works: 0, stretch: 1, no: 2 };
const worse = (a: Fit, b: Fit): Fit => (RANK[a] >= RANK[b] ? a : b);

const wants = (d: Destination, r: ResponseRow) => !!r.wants?.includes(d.id);

/**
 * The label a member gets for a destination. Only the label is ever shown.
 * When the organizer picked places, a place someone didn't ask for is at best a stretch for them.
 */
function memberFit(d: Destination, r: ResponseRow, hasShortlist: boolean): Fit {
  if (hitsDealbreaker(d, r)) return "no";
  const fit = worse(budgetFit(d, r), typeMatches(d, r) ? "works" : "stretch");
  return hasShortlist && r.wants?.length && !wants(d, r) ? worse(fit, "stretch") : fit;
}

function score(d: Destination, rs: ResponseRow[]) {
  let s = 0;
  for (const r of rs) {
    const b = budgetFit(d, r);
    s += b === "works" ? 3 : b === "stretch" ? 1 : -3;
    if (typeMatches(d, r)) s += 2;
    if (wants(d, r)) s += 4; // someone actually asked for it
  }
  return s;
}

/**
 * 1. Pick the date window most people can make.
 * 2. Without a shortlist: drop any destination that hits a dealbreaker for
 *    someone who can make it, score the rest on budget, type fit and who asked
 *    for it, keep the top 3.
 *    With the organizer's shortlist: rank those places plus any the group said
 *    they'd rather go to, keep the top 3. Nothing is dropped; a dealbreaker just
 *    marks that person "doesn't work", so fewest "doesn't work" ranks first.
 * 3. Label every member works / stretch / doesn't work for each option.
 */
export function decide(
  members: string[],
  responses: ResponseRow[],
  shortlist?: string[],
  today?: string,
): { window: DateWindow | null; options: TripOption[] } {
  const window = bestWindow(responses.map((r) => ({ member: r.person_name, windows: r.date_windows })), today);
  const going = responses.filter((r) => window?.available.includes(r.person_name));
  const hasShortlist = !!shortlist?.length;
  const picked = hasShortlist
    ? DESTINATIONS.filter((d) => shortlist!.includes(d.id) || going.some((r) => wants(d, r)))
    : null;

  const ranked = (picked ?? DESTINATIONS.filter((d) => !going.some((r) => hitsDealbreaker(d, r))))
    .map((d) => ({
      d,
      score: score(d, going),
      noCount: going.filter((r) => memberFit(d, r, hasShortlist) === "no").length,
    }))
    .sort(
      (a, b) =>
        // Shortlisted places can hit dealbreakers, so fewest "doesn't work" comes first.
        (picked ? a.noCount - b.noCount : 0) ||
        b.score - a.score ||
        a.noCount - b.noCount ||
        a.d.cost[1] - b.d.cost[1] ||
        a.d.travelHours - b.d.travelHours,
    )
    .slice(0, TOP_N);

  const options = ranked.map(({ d }): TripOption => ({
    id: d.id,
    name: d.name,
    region: d.region,
    type: d.type,
    blurb: d.blurb,
    costLabel: costLabel(d),
    travelLabel: travelLabel(d),
    votes: going.filter((r) => wants(d, r)).length,
    fits: members.map((member): MemberFit => {
      const r = responses.find((x) => x.person_name === member);
      if (!r) return { member, fit: "works", note: "Going with the group" };
      if (!window?.available.includes(member)) return { member, fit: "no", note: "Can't make the dates" };
      return { member, fit: memberFit(d, r, hasShortlist) };
    }),
  }));

  return { window, options };
}

/** The plan is the first option nobody has vetoed. */
export function currentPlan(options: TripOption[] | null, vetoedIds: string[]) {
  return options?.find((o) => !vetoedIds.includes(o.id)) ?? null;
}
