"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, rupees } from "@/lib/api";
import { formatDate, formatRange } from "@/lib/dates";
import type { AdminState } from "@/lib/trips";
import FitList from "./FitList";
import { Progress } from "./OptionsView";
import { Button, Card, CopyLink, ErrorNote } from "./ui";

const noop = () => () => {};

export default function AdminView({ initial }: { initial: AdminState }) {
  const [trip, setTrip] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const headers = { "x-admin-token": trip.adminToken };

  const refresh = useCallback(async () => {
    try {
      setTrip(await api<AdminState>(`/api/trips/${trip.id}/admin`, { headers: { "x-admin-token": trip.adminToken } }));
    } catch {}
  }, [trip.id, trip.adminToken]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 15000);
    return () => clearInterval(t);
  }, [refresh]);

  async function act(key: string, path: string, body: object = {}) {
    setBusy(key);
    setError(null);
    try {
      setTrip(await api<AdminState>(`/api/trips/${trip.id}/admin/${path}`, { body, headers }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const missing = trip.members.filter((m) => !trip.submitted.includes(m));
  const plan = trip.options?.find((o) => o.id === trip.planId) ?? null;
  // Only payments made for the current plan count towards locking it.
  const verifiedCount = trip.confirmations.filter((c) => c.verified && c.option_key === trip.planId).length;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Organizer · private</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{trip.name}</h1>
        <p className="text-sm text-stone-600">
          {rupees(trip.advanceAmount)} advance · locks at {trip.minConfirmations} paid · UPI {trip.upiId ?? "not set"}
        </p>
      </header>

      {origin && (
        <Card>
          <CopyLink
            label="Group link"
            url={`${origin}/t/${trip.id}`}
            shareText={trip.status === "collecting" ? "Add your dates & budget for the trip (1 min, answers lock):" : "Options are out. Check the plan and pay the advance to lock your spot:"}
          />
          <a href={`/t/${trip.id}`} className="mt-2 block text-center text-sm font-semibold text-brand-700 underline">
            Open the group view as a member →
          </a>
        </Card>
      )}

      <ErrorNote message={error} />

      {trip.status === "collecting" && (
        <Card>
          <h2 className="text-lg font-bold">
            Answers in: {trip.submitted.length}/{trip.members.length}
          </h2>
          <ul className="mt-2 divide-y divide-stone-100">
            {trip.members.map((m) => (
              <li key={m} className="flex justify-between py-2">
                <span className="font-medium">{m}</span>
                {trip.submitted.includes(m) ? (
                  <span className="text-sm font-semibold text-green-700">✓ Submitted</span>
                ) : (
                  <span className="text-sm text-stone-400">Waiting</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-600">
            {missing.length > 0
              ? `If you close now, ${missing.join(", ")} will go with the group's pick.`
              : "Everyone has answered."}
          </p>
          <Button
            className="mt-3 w-full"
            disabled={!!busy || trip.submitted.length < 2}
            onClick={() => {
              if (window.confirm("Close collection and show options? Nobody can submit after this.")) act("close", "close");
            }}
          >
            {busy === "close" ? "Working it out…" : "Close collection & show options"}
          </Button>
          {trip.submitted.length < 2 && <p className="mt-2 text-center text-xs text-stone-500">Needs at least 2 answers.</p>}
        </Card>
      )}

      {trip.status !== "collecting" && (
        <>
          {trip.status === "locked" && (
            <Card className="border-2 border-green-500 bg-green-50 text-center">
              <p className="text-3xl">🎉</p>
              <h2 className="text-xl font-bold text-green-900">Trip is on!</h2>
              <p className="text-stone-700">Time to book.</p>
            </Card>
          )}
          {trip.dateWindow && plan && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {trip.status === "deciding" ? "The plan · vetoes open" : "The plan · final"}{trip.vetoedOptionIds.length > 0 && ` · ${trip.vetoedOptionIds.length} vetoed`}
              </p>
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="text-stone-700">{formatRange(trip.dateWindow.start, trip.dateWindow.end)}</p>
              <p className="mb-2 text-sm text-stone-600">
                {plan.costLabel} · {plan.travelLabel}
              </p>
              <FitList fits={plan.fits} />
              {trip.status === "deciding" && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <p className="mb-2 text-sm text-stone-600">
                    Members can still veto this. When you&apos;re happy to go ahead, finalise it. Vetoes close and
                    everyone can pay the advance.
                  </p>
                  <Button
                    className="w-full"
                    disabled={!!busy}
                    onClick={() => {
                      if (window.confirm(`Finalise ${plan.name}? Nobody can veto after this, and payments open.`)) act("finalize", "finalize");
                    }}
                  >
                    {busy === "finalize" ? "Finalising…" : "Finalise plan & open payments"}
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold">Payments</h2>
            <p className="text-sm text-stone-600">Check your UPI app, then verify each payment you&apos;ve received.</p>
            <Progress value={verifiedCount} max={trip.minConfirmations} />
            {trip.confirmations.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                {trip.status === "deciding" ? "Payments open after you finalise the plan." : "Nobody has marked themselves as paid yet."}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {trip.confirmations.map((c) => (
                  <li key={c.person_name} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{c.person_name}</span>
                      <span className="block text-xs text-stone-500">
                        Says paid {formatDate(c.marked_paid_at.slice(0, 10), { day: "numeric", month: "short" })}
                        {c.option_key !== trip.planId && ` · paid for ${trip.options?.find((o) => o.id === c.option_key)?.name ?? c.option_key}, not the plan`}
                      </span>
                    </span>
                    {c.verified ? (
                      <span className="text-sm font-semibold text-green-700">✓ Verified</span>
                    ) : (
                      <Button className="min-h-10 px-3 text-sm" disabled={!!busy} onClick={() => act(c.person_name, "verify", { member: c.person_name })}>
                        {busy === c.person_name ? "…" : `Got ${rupees(trip.advanceAmount)}`}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(() => {
              const notPaid = trip.members.filter((m) => !trip.confirmations.some((c) => c.person_name === m));
              return notPaid.length > 0 ? <p className="mt-2 text-sm text-stone-500">Not paid yet: {notPaid.join(", ")}</p> : null;
            })()}
          </Card>
        </>
      )}
    </div>
  );
}
