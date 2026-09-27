"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, rupees } from "@/lib/api";
import type { PublicTrip } from "@/lib/types";
import { FitMatrix } from "./Destination";
import PreferenceForm from "./PreferenceForm";
import { DatesCard, howPlacesArePicked, OptionTiles, PeopleCard, PlanHero, RulesCard, TripHero, TripIsOn } from "./TripParts";
import UpiPay from "./UpiPay";
import { Avatar, Button, Card, ErrorNote, Eyebrow, ProgressRing, Shell, useConfirm } from "./ui";

// Identity is just "which name did you pick on this phone", plus a token
// handed out when you submit so nobody else can spend your veto.
const meKey = (id: string) => `td:${id}:me`;
const tokenKey = (id: string, name: string) => `td:${id}:token:${name}`;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const listeners = new Set<() => void>();
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

type Me = NonNullable<PublicTrip["me"]>;

export default function MemberView({ initial }: { initial: PublicTrip }) {
  const [trip, setTrip] = useState(initial);
  // undefined = not read yet (server render), null = hasn't picked a name
  const me = useSyncExternalStore(
    subscribe,
    () => {
      const saved = read(meKey(initial.id));
      return saved && initial.members.includes(saved) ? saved : null;
    },
    () => undefined,
  );

  const refresh = useCallback(
    async (name: string | null | undefined = me) => {
      const q = name ? `?member=${encodeURIComponent(name)}` : "";
      const token = name ? read(tokenKey(trip.id, name)) : null;
      try {
        setTrip(await api<PublicTrip>(`/api/trips/${trip.id}${q}`, { headers: token ? { "x-member-token": token } : {} }));
      } catch {}
    },
    [me, trip.id],
  );

  // Load this member's own state (veto, payment) whenever the name changes.
  useEffect(() => {
    // refresh only sets state after its fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (me) refresh(me);
  }, [me, refresh]);

  // Keep the status fresh while people are deciding and paying.
  useEffect(() => {
    if (trip.status === "locked") return;
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 15000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, trip.status]);

  const choose = (name: string | null) => write(meKey(trip.id), name);

  const whoAmI = me ? (
    <button onClick={() => choose(null)} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50" title="Not you? Switch">
      <Avatar name={me} size="sm" />
      <span className="max-w-28 truncate">{me}</span>
      <span className="text-xs text-slate-400">switch</span>
    </button>
  ) : null;

  const meState = me && trip.me?.name === me ? trip.me : null;
  const hasToken = !!me && !!read(tokenKey(trip.id, me));

  let main: React.ReactNode = null;
  if (me === null) main = <PickName trip={trip} onPick={choose} />;
  else if (me && trip.status === "collecting") {
    main =
      meState && !meState.submitted ? (
        <div className="space-y-4">
          <Card className="animate-rise bg-linear-to-br! from-cyan-50 to-white">
            <p className="text-lg font-extrabold">Hey {me} 👋</p>
            <p className="mt-1 text-sm text-slate-600">
              {trip.organizerName} is planning <b>{trip.name}</b>. Answer a few quick questions, once and honestly.{" "}
The app finds the dates and places that work for the most people.
            </p>
          </Card>
          <PreferenceForm
            tripId={trip.id}
            member={me}
            organizerName={trip.organizerName}
            shortlist={trip.shortlist}
            onSubmitted={(token) => {
              write(tokenKey(trip.id, me), token);
              refresh(me);
            }}
          />
        </div>
      ) : meState ? (
        <Waiting trip={trip} name={me} fromThisPhone={hasToken} />
      ) : null;
  } else if (me && meState) {
    main = <Decided trip={trip} me={meState} token={read(tokenKey(trip.id, me))} onChange={() => refresh(me)} />;
  }
  // Still reading who you are, or loading your own state.
  if (me === undefined || (me && !meState)) main = <Skeleton />;

  return (
    <Shell wide right={whoAmI}>
      <div className="space-y-5">
        <TripHero trip={trip} eyebrow="Group trip" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">{main}</div>
          <aside className="space-y-5">
            <PeopleCard trip={trip} />
            <RulesCard trip={trip} />
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function Skeleton() {
  return (
    <Card>
      <div className="animate-pulse space-y-3" aria-label="Loading">
        <div className="h-5 w-1/3 rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 rounded-full bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
      </div>
    </Card>
  );
}

function PickName({ trip, onPick }: { trip: PublicTrip; onPick: (name: string) => void }) {
  return (
    <Card className="animate-rise">
      <h2 className="text-xl font-extrabold">Who are you?</h2>
      <p className="mt-1 text-sm text-slate-600">
        {trip.status === "collecting" ? "Tap your name to add your answers. A ✓ means that person has already answered." : "Tap your name to see the plan and pay your advance."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {trip.members.map((m) => {
          const done = trip.status === "collecting" && trip.submitted.includes(m);
          return (
            <button
              key={m}
              onClick={() => onPick(m)}
              className="group relative flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:scale-[0.98]"
            >
              <Avatar name={m} size="lg" dim={done} />
              <span className="max-w-full truncate text-sm font-bold">{m}</span>
              {done && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Waiting({ trip, name, fromThisPhone }: { trip: PublicTrip; name: string; fromThisPhone: boolean }) {
  const left = trip.members.length - trip.submitted.length;
  return (
    <Card flush className="animate-rise">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-6 text-white">
        <p className="animate-pop text-4xl">{fromThisPhone ? "🔒" : "✅"}</p>
        <h2 className="mt-2 text-2xl font-extrabold">{fromThisPhone ? "You're locked in" : `${name} has already answered`}</h2>
        <p className="mt-1 text-white/90">
          {fromThisPhone ? "Your answers are saved and can't change. Nice." : `Answers can't be changed. Not ${name}? Tap your name at the top to switch.`}
        </p>
      </div>
      <div className="space-y-3 p-6">
        <p className="font-bold">What happens next</p>
        <ol className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-bold text-collect">1.</span>
            {left > 0 ? `Waiting on ${left} more ${left === 1 ? "person" : "people"}.` : "Everyone has answered 🙌"}
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-decide">2.</span>
            {trip.organizerName} closes collection. {howPlacesArePicked(trip)}
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-commit">3.</span>
            You&apos;ll see the plan here, with your one veto, then pay the {rupees(trip.advanceAmount)} advance.
          </li>
        </ol>
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">This page updates by itself. Come back via the same link.</p>
      </div>
    </Card>
  );
}

function Decided({ trip, me, token, onChange }: { trip: PublicTrip; me: Me; token: string | null; onChange: () => void }) {
  const options = trip.options ?? [];
  const plan = options.find((o) => o.id === trip.planId) ?? null;
  const locked = trip.status === "locked";

  return (
    <>
      {locked && plan && <TripIsOn trip={trip} plan={plan} />}
      {/* While deciding, the plan (and your veto) comes first; once it's final, paying does. */}
      {trip.status !== "deciding" && (!locked || !me.verified) && <PayCard trip={trip} me={me} onChange={onChange} />}
      {plan && !locked && <PlanHero trip={trip} plan={plan} footer={<VetoControls trip={trip} me={me} token={token} onChange={onChange} />} />}
      {trip.status === "deciding" && <PayCard trip={trip} me={me} onChange={onChange} />}
      {trip.dateWindow && <DatesCard window={trip.dateWindow} total={trip.members.length} />}
      {options.length > 1 && (
        <Card className="animate-rise">
          <Eyebrow>All options</Eyebrow>
          <h3 className="mt-1 text-lg font-extrabold">The top {options.length}, ranked</h3>
          <div className="mt-4">
            <OptionTiles trip={trip} />
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-bold">Fit view: who each option works for</p>
            <FitMatrix options={options} planId={trip.planId} vetoed={trip.vetoedOptionIds} />
          </div>
        </Card>
      )}
    </>
  );
}

function VetoControls({ trip, me, token, onChange }: { trip: PublicTrip; me: Me; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();
  const plan = trip.options?.find((o) => o.id === trip.planId);
  if (!plan) return null;
  const isLast = trip.options?.at(-1)?.id === plan.id;

  async function veto() {
    const ok = await confirm({
      title: `Veto ${plan!.name}?`,
      body: "You get one veto for the whole trip, and you can't take it back. It's anonymous: nobody sees who used it. The next option becomes the plan.",
      confirm: "Use my veto",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/trips/${trip.id}/veto`, { body: { member: me.name, optionId: plan!.id }, headers: token ? { "x-member-token": token } : {} });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  let note: string;
  if (trip.status !== "deciding") note = `${trip.organizerName} has finalised the plan, so vetoes are closed.`;
  else if (me.vetoUsed) note = "You've used your veto.";
  else if (isLast) note = "This is the last option, so it can't be vetoed.";
  else if (!me.submitted) note = "You didn't submit answers, so you're going with the group's pick.";
  else if (!me.canVeto) note = "To veto, use the phone you submitted your answers on.";
  else note = `This is happening unless someone vetoes it. Vetoes are anonymous and close when ${trip.organizerName} finalises the plan.`;

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg" aria-hidden>
          {me.canVeto ? "✋" : "ℹ️"}
        </span>
        <p className="pt-1.5 text-sm text-slate-600">{note}</p>
      </div>
      {me.canVeto && (
        <Button variant="danger" className="w-full" onClick={veto} disabled={busy}>
          {busy ? "Vetoing…" : `✋ Veto ${plan.name} (1 left)`}
        </Button>
      )}
      <ErrorNote message={error} />
    </div>
  );
}

function PayCard({ trip, me, onChange }: { trip: PublicTrip; me: Me; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verified = trip.paid.filter((p) => p.verified).length;

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

  let body: React.ReactNode;
  if (trip.status === "deciding") {
    body = (
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        ⏳ Payments open once {trip.organizerName} finalises the plan. Until then a veto can still change it.
      </p>
    );
  } else if (me.verified) {
    body = <p className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-800">✅ You&apos;re in. Payment verified.</p>;
  } else if (me.paid) {
    body = <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">⏳ Thanks! Waiting for {trip.organizerName} to confirm your payment.</p>;
  } else {
    body = (
      <div className="space-y-3">
        {trip.upiId ? (
          <UpiPay upiId={trip.upiId} payee={trip.organizerName} amount={trip.advanceAmount} note={`${trip.name} advance`} />
        ) : (
          <p className="text-sm text-slate-600">Ask {trip.organizerName} for their UPI ID and pay them directly.</p>
        )}
        <Button variant="secondary" className="w-full" onClick={markPaid} disabled={busy}>
          {busy ? "Saving…" : "✓ I've paid"}
        </Button>
        <ErrorNote message={error} />
      </div>
    );
  }

  const highlight = trip.status === "confirming" && !me.paid;
  return (
    <Card className={`animate-rise ${highlight ? "ring-2 ring-emerald-300" : ""}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing value={verified} max={trip.minConfirmations} label="paid" />
        <div className="min-w-0 flex-1">
          <Eyebrow className="text-commit">Commit</Eyebrow>
          <h2 className="mt-1 text-xl font-extrabold">
            Pay {rupees(trip.advanceAmount)} to {trip.organizerName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            The trip is on once {trip.minConfirmations} people have paid. Saying yes doesn&apos;t count until you&apos;ve paid.
          </p>
        </div>
      </div>
      <div className="mt-5">{body}</div>
    </Card>
  );
}
