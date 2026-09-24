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
  const cap = BUDGETS.find((b) => b.id === r.budget)?.cap ?? 0;
  if (d.cost[1] <= cap) return "works"; // even the pricier end fits
  if (d.cost[0] <= cap) return "stretch"; // only doable at the cheap end
  return "no";
}

function typeMatches(d: Destination, r: ResponseRow) {
  return r.destination_types.includes(d.type);
}

const RANK: Record<Fit, number> = { works: 0, stretch: 1, no: 2 };
const worse = (a: Fit, b: Fit): Fit => (RANK[a] >= RANK[b] ? a : b);

/** The label a member gets for a destination. Only the label is ever shown. */
function memberFit(d: Destination, r: ResponseRow): Fit {
  if (hitsDealbreaker(d, r)) return "no";
  return worse(budgetFit(d, r), typeMatches(d, r) ? "works" : "stretch");
}

function score(d: Destination, rs: ResponseRow[]) {
  let s = 0;
  for (const r of rs) {
    const b = budgetFit(d, r);
    s += b === "works" ? 3 : b === "stretch" ? 1 : -3;
    if (typeMatches(d, r)) s += 2;
  }
  return s;
}

export type Decision = { window: DateWindow | null; options: TripOption[] };

/**
 * 1. Pick the date window most people can make.
 * 2. Drop any destination that hits a dealbreaker for someone who can make it.
 * 3. Score the rest on budget and type fit; keep the top 3.
 * 4. Label every member works / stretch / doesn't work for each option.
 */
export function decide(members: string[], responses: ResponseRow[], today?: string): Decision {
  const window = bestWindow(responses.map((r) => ({ member: r.member_name, windows: r.windows })), today);
  const going = responses.filter((r) => window?.available.includes(r.member_name));

  const ranked = DESTINATIONS.filter((d) => !going.some((r) => hitsDealbreaker(d, r)))
    .map((d) => ({
      d,
      score: score(d, going),
      noCount: going.filter((r) => memberFit(d, r) === "no").length,
    }))
    .sort(
      (a, b) =>
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
    fits: members.map((member): MemberFit => {
      const r = responses.find((x) => x.member_name === member);
      if (!r) return { member, fit: "works", note: "Going with the group" };
      if (!window?.available.includes(member)) return { member, fit: "no", note: "Can't make the dates" };
      return { member, fit: memberFit(d, r) };
    }),
  }));

  return { window, options };
}

/** The plan is the first option nobody has vetoed. */
export function currentPlan(options: TripOption[] | null, vetoedIds: string[]) {
  return options?.find((o) => !vetoedIds.includes(o.id)) ?? null;
}
