"use client";

import type { ReactNode } from "react";
import { rupees } from "@/lib/api";
import { formatDate, formatRange, todayIST } from "@/lib/dates";
import { DESTINATIONS, HOME_CITY } from "@/lib/destinations";
import type { DateWindow, PublicTrip, TripOption, TripStatus } from "@/lib/types";
import { DestinationArt, FitBar, FitList, typeArt } from "./Destination";
import Journey from "./Journey";
import { Avatar, Badge, Card, Eyebrow, ProgressBar } from "./ui";

/** Names of the places the organizer put on the table, or null if the app suggests. */
export function shortlistNames(trip: PublicTrip) {
  return trip.shortlist ? DESTINATIONS.filter((d) => trip.shortlist!.includes(d.id)).map((d) => d.name) : null;
}

/** One line on how the options are picked, for "what happens next" copy. */
export function howPlacesArePicked(trip: PublicTrip) {
  const names = shortlistNames(trip);
  if (!names) return "The app picks the dates and the top 3 places.";
  if (names.length === 1) return `The app picks the dates. It's ${names[0]} unless the group would rather go elsewhere.`;
  return `The app picks the dates and ranks ${trip.organizerName}'s places plus any the group suggested.`;
}

export function daysUntil(date: string) {
  return Math.round((Date.parse(date) - Date.parse(todayIST())) / 86_400_000);
}

const STATUS_BADGE: Record<TripStatus, { label: string; tone: "cyan" | "amber" | "green" | "brand" }> = {
  collecting: { label: "Collecting answers", tone: "cyan" },
  deciding: { label: "Deciding · vetoes open", tone: "amber" },
  confirming: { label: "Plan final · paying", tone: "green" },
  locked: { label: "Trip locked 🎉", tone: "green" },
};

/** Trip title, status and the four-stage progress strip. */
export function TripHero({ trip, eyebrow, right }: { trip: PublicTrip; eyebrow: ReactNode; right?: ReactNode }) {
  const badge = STATUS_BADGE[trip.status];
  return (
    <Card className="animate-rise">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow className="text-brand-600">{eyebrow}</Eyebrow>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{trip.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span>Organized by {trip.organizerName}</span>
          </div>
          {trip.status === "collecting" && <WhereLine trip={trip} />}
        </div>
        {right}
      </div>
      <div className="mt-6">
        <Journey status={trip.status} />
      </div>
    </Card>
  );
}

function WhereLine({ trip }: { trip: PublicTrip }) {
  const names = shortlistNames(trip);
  return (
    <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span aria-hidden>📍</span>
      {!names ? (
        <span>Where: the app suggests the best 3 places for the group</span>
      ) : names.length === 1 ? (
        <span>
          {trip.organizerName} is keen on <b>{names[0]}</b>. Everyone can say yes or suggest somewhere else
        </span>
      ) : (
        <span>
          {trip.organizerName} is choosing between <b>{names.join(", ")}</b>. Everyone can suggest others
        </span>
      )}
    </p>
  );
}

export function DatesCard({ window: w, total }: { window: DateWindow; total: number }) {
  const until = daysUntil(w.start);
  return (
    <Card className="animate-rise">
      <div className="flex items-start gap-4">
        <div className="grid w-16 shrink-0 overflow-hidden rounded-2xl text-center shadow-sm ring-1 ring-slate-200">
          <span className="bg-rose-500 py-0.5 text-[11px] font-bold uppercase text-white">{formatDate(w.start, { month: "short" })}</span>
          <span className="bg-white py-1 text-2xl font-extrabold">{formatDate(w.start, { day: "numeric" })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <Eyebrow>The dates</Eyebrow>
          <p className="mt-0.5 text-lg font-extrabold">{formatRange(w.start, w.end)}</p>
          <p className="text-sm text-slate-600">
            {w.days} days{w.weekendDays > 0 && ` · ${w.weekendDays} weekend day${w.weekendDays > 1 ? "s" : ""}`}
            {until > 0 && ` · in ${until} days`}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-500">
          {w.available.length} of {total} can make these dates
        </p>
        <div className="flex flex-wrap gap-1.5">
          {w.available.map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-semibold shadow-sm">
              <Avatar name={m} size="sm" /> {m}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function OptionFacts({ option }: { option: TripOption }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
        {typeArt(option.type).emoji} {typeArt(option.type).label}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">💸 {option.costLabel}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">🚗 {option.travelLabel}</span>
      {!!option.votes && <VotesPill votes={option.votes} />}
    </div>
  );
}

function VotesPill({ votes }: { votes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-bold text-brand-700">
      👍 {votes} {votes === 1 ? "wants" : "want"} this
    </span>
  );
}

/** The big "this is the plan" card. `footer` holds the veto or finalise controls. */
export function PlanHero({ trip, plan, footer }: { trip: PublicTrip; plan: TripOption; footer?: ReactNode }) {
  const vetoCount = trip.vetoedOptionIds.length;
  return (
    <Card flush className="animate-rise ring-2 ring-brand-200">
      <DestinationArt option={plan}>
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-brand-700 shadow-sm">
            {trip.status === "deciding" ? "⭐ The plan" : "✅ The plan · final"}
          </span>
          {vetoCount > 0 && (
            <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              {vetoCount} option{vetoCount > 1 ? "s" : ""} vetoed
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-5 right-5 text-white drop-shadow">
          <p className="text-sm font-semibold text-white/90">{plan.region}</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{plan.name}</h2>
        </div>
      </DestinationArt>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-slate-700">{plan.blurb}</p>
        <OptionFacts option={plan} />
        <div>
          <p className="mb-2 text-sm font-bold">How it fits the group</p>
          <FitBar fits={plan.fits} />
          <div className="mt-3">
            <FitList fits={plan.fits} />
          </div>
        </div>
        {footer && <div className="border-t border-slate-100 pt-4">{footer}</div>}
      </div>
    </Card>
  );
}

export function OptionTiles({ trip }: { trip: PublicTrip }) {
  const options = trip.options ?? [];
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o, i) => {
          const vetoed = trip.vetoedOptionIds.includes(o.id);
          const isPlan = o.id === trip.planId;
          return (
            <div
              key={o.id}
              className={`overflow-hidden rounded-3xl border bg-white shadow-soft transition ${isPlan ? "border-brand-300 ring-2 ring-brand-200" : "border-slate-200/70"} ${vetoed ? "opacity-55" : ""}`}
            >
              <DestinationArt option={o} size="sm">
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 shadow-sm">
                  #{i + 1}
                  {isPlan && <span className="text-brand-600"> · Plan</span>}
                  {vetoed && <span className="text-rose-600"> · Vetoed</span>}
                </span>
              </DestinationArt>
              <div className="space-y-2 p-4">
                <div>
                  <p className={`font-extrabold ${vetoed ? "line-through" : ""}`}>{o.name}</p>
                  <p className="text-xs text-slate-500">
                    {o.costLabel} · {o.travelLabel}
                  </p>
                  {!!o.votes && (
                    <p className="mt-1 text-xs font-bold text-brand-700">
                      👍 {o.votes} {o.votes === 1 ? "wants" : "want"} this
                    </p>
                  )}
                </div>
                <FitBar fits={o.fits} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-xs text-slate-500">Travel times from {HOME_CITY}. Costs are per person and exclude travel.</p>
    </div>
  );
}

/** Who has answered (while collecting) or who has paid (afterwards). */
export function PeopleCard({ trip }: { trip: PublicTrip }) {
  const collecting = trip.status === "collecting";
  const verified = new Set(trip.paid.filter((p) => p.verified).map((p) => p.member));
  const pending = new Set(trip.paid.filter((p) => !p.verified).map((p) => p.member));
  const done = collecting ? trip.submitted.length : verified.size;
  const max = collecting ? trip.members.length : trip.minConfirmations;

  return (
    <Card className="animate-rise">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-extrabold">{collecting ? "Who's answered" : "Who's in"}</h3>
        <span className="text-sm font-bold text-slate-500">
          {done}/{max}
          {!collecting && <span className="font-medium"> to lock</span>}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar value={done} max={max} tone={collecting ? "cyan" : "green"} />
      </div>
      <ul className="mt-4 space-y-2">
        {trip.members.map((m) => {
          let status: ReactNode;
          let ring: "green" | "amber" | undefined;
          let dim = false;
          if (collecting) {
            const ok = trip.submitted.includes(m);
            dim = !ok;
            status = ok ? <Badge tone="green">✓ Answered</Badge> : <Badge>Waiting</Badge>;
          } else if (verified.has(m)) {
            ring = "green";
            status = <Badge tone="green">✓ Paid</Badge>;
          } else if (pending.has(m)) {
            ring = "amber";
            status = <Badge tone="amber">Checking</Badge>;
          } else {
            dim = trip.status !== "deciding";
            status = <Badge>{trip.status === "deciding" ? "Deciding" : "Not paid"}</Badge>;
          }
          return (
            <li key={m} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={m} dim={dim} ring={ring} />
                <span className="truncate text-sm font-semibold">
                  {m}
                  {m === trip.organizerName && <span className="ml-1 text-xs font-medium text-slate-400">organizer</span>}
                </span>
              </span>
              {status}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function RulesCard({ trip }: { trip: PublicTrip }) {
  const rules = [
    { icon: "🔒", text: "Answers lock on submit. Budgets and dealbreakers stay private." },
    { icon: "📅", text: "Dates are locked first: the window the most people can make." },
    { icon: "⭐", text: "The top option is the plan unless someone uses their one veto." },
    { icon: "🎟️", text: `The trip is on once ${trip.minConfirmations} people pay the ${rupees(trip.advanceAmount)} advance.` },
  ];
  return (
    <Card className="animate-rise bg-linear-to-br! from-white to-slate-50">
      <h3 className="font-extrabold">How this works</h3>
      <ul className="mt-3 space-y-3">
        {rules.map((r) => (
          <li key={r.icon} className="flex gap-3 text-sm text-slate-600">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-hidden>
              {r.icon}
            </span>
            <span className="pt-1">{r.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TripIsOn({ trip, plan }: { trip: PublicTrip; plan: TripOption }) {
  const w = trip.dateWindow;
  const verified = trip.paid.filter((p) => p.verified).map((p) => p.member);
  const until = w ? daysUntil(w.start) : null;
  return (
    <Card flush className="animate-rise relative">
      <DestinationArt option={plan}>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-emerald-900/20 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <p className="animate-pop text-4xl">🎉</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">The trip is on!</h2>
          <p className="font-semibold text-white/90">
            {plan.name}
            {w && ` · ${formatRange(w.start, w.end)}`}
          </p>
        </div>
      </DestinationArt>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-bold text-emerald-800">Who&apos;s in ({verified.length})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {verified.map((m) => (
              <li key={m} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-0.5 pl-0.5 pr-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
                <Avatar name={m} size="sm" /> {m}
              </li>
            ))}
          </ul>
        </div>
        {until !== null && until > 0 && (
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-center ring-1 ring-emerald-200">
            <p className="text-3xl font-extrabold text-emerald-700">{until}</p>
            <p className="text-xs font-bold text-emerald-800">days to go</p>
          </div>
        )}
      </div>
    </Card>
  );
}
