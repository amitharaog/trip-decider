"use client";

import { useState } from "react";
import { api, rupees } from "@/lib/api";
import { formatRange } from "@/lib/dates";
import { HOME_CITY } from "@/lib/destinations";
import type { PublicTrip, TripOption } from "@/lib/types";
import FitList, { FitSummary } from "./FitList";
import UpiPay from "./UpiPay";
import { Button, Card, ErrorNote } from "./ui";

type Me = NonNullable<PublicTrip["me"]>;

export default function OptionsView({
  trip,
  me,
  token,
  onChange,
}: {
  trip: PublicTrip;
  me: Me;
  token: string | null;
  onChange: () => void;
}) {
  const options = trip.options ?? [];
  const plan = options.find((o) => o.id === trip.planId) ?? null;
  const w = trip.dateWindow;
  const verified = trip.paid.filter((p) => p.verified).map((p) => p.member);

  return (
    <>
      {trip.status === "locked" && plan && <TripIsOn trip={trip} plan={plan} verified={verified} />}

      {w && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">The dates</p>
          <p className="mt-1 text-xl font-bold">{formatRange(w.start, w.end)}</p>
          <p className="text-sm text-stone-600">
            {w.days} days · {w.available.length} of {trip.members.length} can make it ({w.available.join(", ")})
          </p>
        </Card>
      )}

      {plan && (trip.status === "deciding" || trip.status === "confirming") && (
        <PlanCard trip={trip} plan={plan} me={me} token={token} onChange={onChange} />
      )}

      {(trip.status !== "locked" || !me.verified) && <Commit trip={trip} me={me} verified={verified} onChange={onChange} />}

      {options.length > 1 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-stone-500">All options</h2>
          <div className="space-y-3">
            {options.map((o, i) => (
              <OptionCard key={o.id} option={o} rank={i + 1} isPlan={o.id === trip.planId} vetoed={trip.vetoedOptionIds.includes(o.id)} />
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-stone-500">Travel times are from {HOME_CITY}. Costs exclude travel.</p>
        </section>
      )}
    </>
  );
}

function OptionHeader({ option }: { option: TripOption }) {
  return (
    <>
      <h3 className="text-xl font-bold">{option.name}</h3>
      <p className="text-sm text-stone-500">{option.region}</p>
      <p className="mt-1 text-stone-700">{option.blurb}</p>
      <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-stone-600">
        <span>{option.costLabel}</span>
        <span>{option.travelLabel}</span>
      </p>
    </>
  );
}

function PlanCard({ trip, plan, me, token, onChange }: { trip: PublicTrip; plan: TripOption; me: Me; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLast = trip.options?.at(-1)?.id === plan.id;
  const vetoCount = trip.vetoedOptionIds.length;

  async function veto() {
    if (!window.confirm(`Use your one veto on ${plan.name}? You can't take it back, and you won't get another one.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/trips/${trip.id}/veto`, { body: { member: me.name, optionId: plan.id }, headers: token ? { "x-member-token": token } : {} });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let vetoNote: string;
  if (trip.status !== "deciding") vetoNote = `${trip.organizerName} has finalised the plan.`;
  else if (me.vetoUsed) vetoNote = "You've used your veto.";
  else if (isLast) vetoNote = "This is the last option, so it can't be vetoed.";
  else if (!me.submitted) vetoNote = "You didn't submit preferences, so you're going with the group's pick.";
  else if (!me.canVeto) vetoNote = "Veto from the phone you submitted your answers on.";
  else vetoNote = `You have one veto for the whole trip. Vetoes are anonymous and close when ${trip.organizerName} finalises the plan.`;

  return (
    <Card className="border-2 border-brand-500">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {trip.status === "deciding" ? "The plan" : "The plan · final"}{vetoCount > 0 && ` · ${vetoCount} option${vetoCount > 1 ? "s" : ""} vetoed`}
      </p>
      <div className="mt-1">
        <OptionHeader option={plan} />
      </div>
      <div className="mt-3">
        <FitList fits={plan.fits} />
      </div>
      <div className="mt-3 border-t border-stone-100 pt-3">
        <p className="mb-2 text-sm text-stone-600">
          {trip.status === "deciding" && "This is happening unless someone vetoes it. "}
          {vetoNote}
        </p>
        {me.canVeto && (
          <Button variant="danger" className="w-full" onClick={veto} disabled={busy}>
            {busy ? "Vetoing…" : `Veto ${plan.name}`}
          </Button>
        )}
        <div className="mt-2">
          <ErrorNote message={error} />
        </div>
      </div>
    </Card>
  );
}

function Commit({ trip, me, verified, onChange }: { trip: PublicTrip; me: Me; verified: string[]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = trip.paid.filter((p) => !p.verified).map((p) => p.member);

  async function markPaid() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/trips/${trip.id}/paid`, { body: { member: me.name } });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Commit</p>
      <h2 className="mt-1 text-lg font-bold">
        Pay {rupees(trip.advanceAmount)} advance to {trip.organizerName}
      </h2>
      <p className="text-sm text-stone-600">
        The trip locks when {trip.minConfirmations} people have paid. Saying yes doesn&apos;t count until you&apos;ve paid.
      </p>

      <Progress value={verified.length} max={trip.minConfirmations} />

      {trip.status === "deciding" ? (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-700">
          Payments open once {trip.organizerName} finalises the plan. Until then, vetoes can still change it.
        </p>
      ) : me.verified ? (
        <p className="mt-3 rounded-xl bg-green-50 px-3 py-3 font-semibold text-green-800">You&apos;re in ✓ Payment verified.</p>
      ) : me.paid ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
          Thanks! Waiting for {trip.organizerName} to confirm your payment.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {trip.upiId ? (
            <UpiPay upiId={trip.upiId} payee={trip.organizerName} amount={trip.advanceAmount} note={`${trip.name} advance`} />
          ) : (
            <p className="text-sm text-stone-600">Ask {trip.organizerName} for their UPI ID and pay them directly.</p>
          )}
          <Button variant="secondary" className="w-full" onClick={markPaid} disabled={busy}>
            {busy ? "Saving…" : "I've paid"}
          </Button>
          <ErrorNote message={error} />
        </div>
      )}

      {(verified.length > 0 || pending.length > 0) && (
        <div className="mt-3 space-y-1 text-sm">
          {verified.length > 0 && <p><span className="font-semibold text-green-700">Paid:</span> {verified.join(", ")}</p>}
          {pending.length > 0 && <p><span className="font-semibold text-amber-700">Awaiting check:</span> {pending.join(", ")}</p>}
        </div>
      )}
    </Card>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="mt-3">
      <div className="h-3 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-stone-600">
        {value} of {max} paid to lock it in
      </p>
    </div>
  );
}

function OptionCard({ option, rank, isPlan, vetoed }: { option: TripOption; rank: number; isPlan: boolean; vetoed: boolean }) {
  return (
    <Card className={vetoed ? "opacity-60" : ""}>
      <details>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Option {rank}
              {isPlan && <span className="text-brand-600"> · The plan</span>}
              {vetoed && <span className="text-red-600"> · Vetoed</span>}
            </span>
            <span className={`block text-lg font-bold ${vetoed ? "line-through" : ""}`}>{option.name}</span>
            <FitSummary fits={option.fits} />
          </span>
          <span className="shrink-0 text-sm font-medium text-brand-700">Details</span>
        </summary>
        <div className="mt-3 border-t border-stone-100 pt-3">
          <OptionHeader option={option} />
          <div className="mt-2">
            <FitList fits={option.fits} />
          </div>
        </div>
      </details>
    </Card>
  );
}

function TripIsOn({ trip, plan, verified }: { trip: PublicTrip; plan: TripOption; verified: string[] }) {
  const w = trip.dateWindow;
  return (
    <Card className="border-2 border-green-500 bg-green-50 text-center">
      <p className="text-4xl">🎉</p>
      <h2 className="mt-1 text-2xl font-bold text-green-900">Trip is on!</h2>
      <p className="mt-1 text-lg font-semibold">{plan.name}</p>
      {w && <p className="text-stone-700">{formatRange(w.start, w.end)}</p>}
      <p className="mt-3 text-sm font-semibold text-green-900">Who&apos;s in ({verified.length})</p>
      <ul className="mt-1 flex flex-wrap justify-center gap-2">
        {verified.map((m) => (
          <li key={m} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-green-800 shadow-sm">
            ✓ {m}
          </li>
        ))}
      </ul>
    </Card>
  );
}
