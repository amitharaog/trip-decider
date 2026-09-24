import type { DestinationType } from "./types";

// Travel is measured door-to-door from the group's home city.
export const HOME_CITY = "Bengaluru";

export type Destination = {
  id: string;
  name: string;
  region: string;
  type: DestinationType;
  blurb: string;
  cost: [number, number]; // ₹ per person for 3–4 days, excluding travel
  travelHours: number; // door-to-door, by the usual route
  flight: boolean; // usual route needs a flight
  tags: ("trekking" | "party" | "cold")[];
};

export const DESTINATIONS: Destination[] = [
  { id: "goa", name: "North Goa", region: "Goa", type: "beach", blurb: "Beach shacks, scooters and late nights.", cost: [10000, 18000], travelHours: 11, flight: false, tags: ["party"] },
  { id: "gokarna", name: "Gokarna", region: "Karnataka", type: "beach", blurb: "Quiet beaches and cliff walks between coves.", cost: [6000, 11000], travelHours: 8, flight: false, tags: [] },
  { id: "pondicherry", name: "Pondicherry", region: "Puducherry", type: "heritage", blurb: "French Quarter cafés, cycling and the promenade.", cost: [8000, 14000], travelHours: 6.5, flight: false, tags: [] },
  { id: "varkala", name: "Varkala", region: "Kerala", type: "beach", blurb: "Red cliffs above the sea and slow mornings.", cost: [10000, 17000], travelHours: 5, flight: true, tags: [] },
  { id: "andaman", name: "Havelock, Andamans", region: "Andaman & Nicobar", type: "beach", blurb: "Clear water, snorkelling, Radhanagar beach.", cost: [25000, 40000], travelHours: 7, flight: true, tags: [] },
  { id: "coorg", name: "Coorg", region: "Karnataka", type: "nature", blurb: "Coffee estates, waterfalls and homestays.", cost: [8000, 14000], travelHours: 5.5, flight: false, tags: [] },
  { id: "chikmagalur", name: "Chikmagalur", region: "Karnataka", type: "mountains", blurb: "Misty hills and the Mullayanagiri trek.", cost: [7000, 13000], travelHours: 5, flight: false, tags: ["trekking"] },
  { id: "ooty", name: "Ooty & Coonoor", region: "Tamil Nadu", type: "mountains", blurb: "Tea gardens, toy train and chilly evenings.", cost: [8000, 14000], travelHours: 7, flight: false, tags: ["cold"] },
  { id: "munnar", name: "Munnar", region: "Kerala", type: "mountains", blurb: "Rolling tea hills and viewpoints.", cost: [10000, 17000], travelHours: 10, flight: false, tags: ["cold"] },
  { id: "manali", name: "Manali & Kasol", region: "Himachal Pradesh", type: "mountains", blurb: "Snow views, cafés, and Kheerganga trek.", cost: [15000, 25000], travelHours: 16, flight: true, tags: ["trekking", "cold", "party"] },
  { id: "hampi", name: "Hampi", region: "Karnataka", type: "heritage", blurb: "Boulder landscapes and Vijayanagara ruins.", cost: [5000, 9000], travelHours: 6.5, flight: false, tags: [] },
  { id: "jaipur", name: "Jaipur", region: "Rajasthan", type: "heritage", blurb: "Forts, bazaars and rooftop dinners.", cost: [12000, 22000], travelHours: 5, flight: true, tags: [] },
  { id: "wayanad", name: "Wayanad", region: "Kerala", type: "nature", blurb: "Forest stays, lakes and spice farms.", cost: [8000, 14000], travelHours: 6, flight: false, tags: [] },
  { id: "kabini", name: "Kabini", region: "Karnataka", type: "nature", blurb: "Riverside lodges and jungle safaris.", cost: [18000, 30000], travelHours: 5, flight: false, tags: [] },
  { id: "dandeli", name: "Dandeli", region: "Karnataka", type: "nature", blurb: "River rafting and jungle camps, off the usual map.", cost: [7000, 12000], travelHours: 8, flight: false, tags: [] },
];

export function costLabel(d: Destination) {
  return `₹${d.cost[0] / 1000}k – ${d.cost[1] / 1000}k pp`;
}

export function travelLabel(d: Destination) {
  return `~${d.travelHours}h ${d.flight ? "incl. flight" : "by road/train"}`;
}
