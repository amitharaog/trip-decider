"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { PublicTrip } from "@/lib/types";
import OptionsView from "./OptionsView";
import PreferenceForm from "./PreferenceForm";
import { Button, Card } from "./ui";

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

  function choose(name: string | null) {
    write(meKey(trip.id), name);
  }

  const header = (
    <header className="mb-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Trip Decider</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight">{trip.name}</h1>
      <p className="text-sm text-stone-600">Organized by {trip.organizerName}</p>
      {me && (
        <p className="mt-2 text-sm text-stone-600">
          You&apos;re <span className="font-semibold text-stone-900">{me}</span> ·{" "}
          <button className="font-medium text-brand-700 underline" onClick={() => choose(null)}>
            not you?
          </button>
        </p>
      )}
    </header>
  );

  if (me === undefined) return header;

  if (!me) {
    return (
      <>
        {header}
        <Card>
          <h2 className="mb-3 text-lg font-bold">Who are you?</h2>
          <div className="grid grid-cols-2 gap-2">
            {trip.members.map((m) => (
              <Button key={m} variant="secondary" onClick={() => choose(m)}>
                {m}
                {trip.submitted.includes(m) && <span className="ml-1 text-green-600">✓</span>}
              </Button>
            ))}
          </div>
        </Card>
      </>
    );
  }

  const meState = trip.me?.name === me ? trip.me : null;
  const showForm = trip.status === "collecting" && meState && !meState.submitted;

  return (
    <>
      {header}
      <div className="space-y-4">
        {showForm ? (
          <PreferenceForm
            tripId={trip.id}
            member={me}
            onSubmitted={(token) => {
              write(tokenKey(trip.id, me), token);
              refresh(me);
            }}
          />
        ) : (
          <>
            {trip.status === "collecting" && <Waiting trip={trip} />}
            {trip.status !== "collecting" && meState && (
              <OptionsView trip={trip} me={meState} token={read(tokenKey(trip.id, me))} onChange={() => refresh(me)} />
            )}
          </>
        )}
        <SubmittedList trip={trip} />
      </div>
    </>
  );
}

function Waiting({ trip }: { trip: PublicTrip }) {
  return (
    <Card className="border-green-200 bg-green-50">
      <h2 className="text-lg font-bold text-green-900">Your answers are locked in ✓</h2>
      <p className="mt-1 text-sm text-green-800">
        {trip.organizerName} will close collection and show the options soon. Anyone who hasn&apos;t answered by then
        goes with the group&apos;s pick.
      </p>
    </Card>
  );
}

function SubmittedList({ trip }: { trip: PublicTrip }) {
  return (
    <Card>
      <h2 className="mb-2 font-bold">
        Answers in: {trip.submitted.length}/{trip.members.length}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {trip.members.map((m) => {
          const done = trip.submitted.includes(m);
          return (
            <li
              key={m}
              className={`rounded-full px-3 py-1 text-sm ${done ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-500"}`}
            >
              {done ? "✓ " : ""}
              {m}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
