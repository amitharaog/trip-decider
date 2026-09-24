export type DestinationType = "beach" | "mountains" | "heritage" | "nature";
export type Budget = "under8k" | "8to15k" | "15to25k" | "25kplus";
export type Dealbreaker = "longTravel" | "flights" | "trekking" | "party" | "cold";
export type TripStatus = "collecting" | "deciding" | "locked";
export type Fit = "works" | "stretch" | "no";

export const DESTINATION_TYPES: { id: DestinationType; label: string; emoji: string }[] = [
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "mountains", label: "Mountains", emoji: "🏔️" },
  { id: "heritage", label: "Heritage / city", emoji: "🏛️" },
  { id: "nature", label: "Nature / offbeat", emoji: "🌿" },
];

// cap = upper bound of the band in ₹ per person, excluding travel
export const BUDGETS: { id: Budget; label: string; cap: number }[] = [
  { id: "under8k", label: "Under ₹8k", cap: 8000 },
  { id: "8to15k", label: "₹8k – 15k", cap: 15000 },
  { id: "15to25k", label: "₹15k – 25k", cap: 25000 },
  { id: "25kplus", label: "₹25k+", cap: Infinity },
];

export const DEALBREAKERS: { id: Dealbreaker; label: string }[] = [
  { id: "longTravel", label: "More than 8 hours of travel" },
  { id: "flights", label: "Flights" },
  { id: "trekking", label: "Trekking" },
  { id: "party", label: "Party-heavy" },
  { id: "cold", label: "Cold weather" },
];

export type DateRange = { start: string; end: string }; // YYYY-MM-DD, inclusive

export type TripRow = {
  id: string;
  name: string;
  organizer_name: string;
  members: string[];
  upi_id: string;
  advance_amount: number;
  min_confirmations: number;
  admin_token: string;
  status: TripStatus;
  date_window: DateWindow | null;
  options: TripOption[] | null;
  created_at: string;
  decided_at: string | null;
  locked_at: string | null;
};

export type ResponseRow = {
  member_name: string;
  member_token: string;
  windows: DateRange[];
  destination_types: DestinationType[];
  budget: Budget;
  dealbreakers: Dealbreaker[];
};

export type DateWindow = {
  start: string;
  end: string;
  days: number;
  weekendDays: number;
  available: string[];
};

export type MemberFit = { member: string; fit: Fit; note?: string };

// What gets frozen into trips.options — labels only, never raw preferences.
export type TripOption = {
  id: string;
  name: string;
  region: string;
  type: DestinationType;
  blurb: string;
  costLabel: string;
  travelLabel: string;
  fits: MemberFit[];
};

export type ConfirmationRow = {
  member_name: string;
  claimed_at: string;
  verified: boolean;
  verified_at: string | null;
};

// Safe to send to any group member.
export type PublicTrip = {
  id: string;
  name: string;
  organizerName: string;
  members: string[];
  status: TripStatus;
  submitted: string[];
  upiId: string;
  advanceAmount: number;
  minConfirmations: number;
  dateWindow: DateWindow | null;
  options: TripOption[] | null;
  vetoedOptionIds: string[];
  planId: string | null;
  paid: { member: string; verified: boolean }[];
  me: { name: string; submitted: boolean; canVeto: boolean; vetoUsed: boolean; paid: boolean; verified: boolean } | null;
};
