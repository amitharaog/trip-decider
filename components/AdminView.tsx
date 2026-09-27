"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, rupees } from "@/lib/api";
import { formatDate, formatRange } from "@/lib/dates";
import type { AdminState } from "@/lib/trips";
import { FitMatrix } from "./Destination";
import { DatesCard, OptionTiles, PeopleCard, PlanHero, TripHero, TripIsOn, daysUntil } from "./TripParts";
import { Avatar, Badge, Button, Card, ErrorNote, Eyebrow, LinkBox, ProgressBar, ProgressRing, Shell, Stat, WhatsAppButton, useConfirm } from "./ui";

const noop = () => () => {};

export default function AdminView({ initial }: { initial: AdminState }) {
  const [trip, setTrip] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

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
      setTrip(await api<AdminState>(`/api/trips/${trip.id}/admin/${path}`, { body, headers: { "x-admin-token": trip.adminToken } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const groupUrl = origin ? `${origin}/t/${trip.id}` : "";
  const missing = trip.members.filter((m) => !trip.submitted.includes(m));
  const plan = trip.options?.find((o) => o.id === trip.planId) ?? null;
  // Only payments made for the current plan count towards locking it.
  const verifiedCount = trip.confirmations.filter((c) => c.verified && c.option_key === trip.planId).length;
  const toVerify = trip.confirmations.filter((c) => !c.verified);
  const w = trip.dateWindow;

  async function closeCollection() {
    const ok = await confirm({
      title: "Close collection and pick the plan?",
      body: (
        <>
          Nobody can submit after this.
          {missing.length > 0 && (
            <>
              {" "}
              <b>{missing.join(", ")}</b> will go with the group&apos;s pick.
            </>
          )}
        </>
      ),
      confirm: "Show the options",
    });
    if (ok) act("close", "close");
  }

  async function finalize() {
    if (!plan) return;
    const ok = await confirm({
      title: `Finalise ${plan.name}?`,
      body: "Vetoes close and everyone can pay the advance. The plan can't change after this.",
      confirm: "Finalise & open payments",
    });
    if (ok) act("finalize", "finalize");
  }

  return (
    <Shell
      wide
      right={
        <a href={`/t/${trip.id}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          Member view ↗
        </a>
      }
    >
      {dialog}
      <div className="space-y-5">
        <TripHero trip={trip} eyebrow="Organizer dashboard · private" />

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Stat icon="📝" tone="cyan" label="Answers in" value={`${trip.submitted.length} / ${trip.members.length}`} sub={missing.length ? `${missing.length} still to answer` : "Everyone answered"} />
          <Stat icon="📅" tone="brand" label="Dates" value={w ? formatRange(w.start, w.end) : "Not picked yet"} sub={w ? `${w.available.length} can make it${daysUntil(w.start) > 0 ? ` · in ${daysUntil(w.start)} days` : ""}` : "Picked when you close collection"} />
          <Stat icon="⭐" tone="amber" label="The plan" value={plan?.name ?? "Not picked yet"} sub={plan ? `${trip.vetoedOptionIds.length} veto${trip.vetoedOptionIds.length === 1 ? "" : "es"} used` : "Top 3 options come next"} />
          <Stat icon="🎟️" tone="green" label="Paid & verified" value={`${verifiedCount} / ${trip.minConfirmations}`} sub={`${rupees(trip.advanceAmount)} each · ${rupees(verifiedCount * trip.advanceAmount)} in`} />
        </div>

        <ErrorNote message={error} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            {trip.status === "collecting" && (
              <Card className="animate-rise">
                <NextStep n={2} color="bg-collect" title="Collect everyone's answers" />
                <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
                  <ProgressRing value={trip.submitted.length} max={trip.members.length} label="answered" />
                  <div className="min-w-0 flex-1 space-y-3">
                    {missing.length > 0 ? (
                      <>
                        <p className="text-sm text-slate-600">Still waiting on:</p>
                        <div className="flex flex-wrap gap-2">
                          {missing.map((m) => (
                            <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-3 text-sm font-semibold">
                              <Avatar name={m} size="sm" /> {m}
                            </span>
                          ))}
                        </div>
                        {groupUrl && (
                          <WhatsAppButton className="w-full sm:w-auto" text={`Hey ${missing.join(", ")} 👋 Still need your dates & budget for ${trip.name}. Takes 1 minute:\n${groupUrl}`}>
                            Nudge them on WhatsApp
                          </WhatsAppButton>
                        )}
                      </>
                    ) : (
                      <p className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">🙌 Everyone has answered. Time to pick the plan.</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="mb-3 text-sm text-slate-600">
                    Don&apos;t wait for everyone. When you close, the app locks the dates most people can make, then ranks the top 3 places. Anyone who
                    hasn&apos;t answered goes with the group.
                  </p>
                  <Button size="lg" className="w-full" disabled={!!busy || trip.submitted.length < 2} onClick={closeCollection}>
                    {busy === "close" ? "Working it out…" : "Close collection & pick the plan →"}
                  </Button>
                  {trip.submitted.length < 2 && <p className="mt-2 text-center text-xs text-slate-500">Needs at least 2 answers.</p>}
                </div>
              </Card>
            )}

            {trip.status === "locked" && plan && (
              <>
                <TripIsOn trip={trip} plan={plan} />
                {groupUrl && (
                  <WhatsAppButton className="w-full" text={`🎉 ${trip.name} is ON! ${plan.name}${w ? `, ${formatRange(w.start, w.end)}` : ""}. Details:\n${groupUrl}`}>
                    Tell the group it&apos;s on
                  </WhatsAppButton>
                )}
              </>
            )}

            {trip.status === "deciding" && plan && (
              <>
                <Card className="animate-rise">
                  <NextStep n={3} color="bg-decide" title="Let the group react, then finalise" />
                  <p className="mt-3 text-sm text-slate-600">
                    The top option is the plan unless someone uses their one veto. When you&apos;re happy, finalise it: vetoes close and payments open.
                  </p>
                </Card>
                <PlanHero
                  trip={trip}
                  plan={plan}
                  footer={
                    <Button size="lg" className="w-full" disabled={!!busy} onClick={finalize}>
                      {busy === "finalize" ? "Finalising…" : `✅ Finalise ${plan.name} & open payments`}
                    </Button>
                  }
                />
              </>
            )}

            {(trip.status === "confirming" || trip.status === "locked") && (
              <Card className="animate-rise">
                {trip.status === "confirming" ? (
                  <NextStep n={4} color="bg-commit" title="Verify payments as they arrive" />
                ) : (
                  <h3 className="text-lg font-extrabold">Payments</h3>
                )}
                <p className="mt-3 text-sm text-slate-600">Check your UPI app, then tap to confirm each advance you&apos;ve received.</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500">
                    <span>{verifiedCount} verified</span>
                    <span>{trip.minConfirmations} needed to lock</span>
                  </div>
                  <ProgressBar value={verifiedCount} max={trip.minConfirmations} />
                </div>

                {trip.confirmations.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-3xl" aria-hidden>💸</p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">Nobody has marked themselves as paid yet.</p>
                    {groupUrl && (
                      <WhatsAppButton className="mt-4" text={`The plan is final: ${plan?.name ?? "see link"}${w ? `, ${formatRange(w.start, w.end)}` : ""} ✅ Pay the ${rupees(trip.advanceAmount)} advance to lock your spot:\n${groupUrl}`}>
                        Ask the group to pay
                      </WhatsAppButton>
                    )}
                  </div>
                ) : (
                  <ul className="mt-5 space-y-2">
                    {[...toVerify, ...trip.confirmations.filter((c) => c.verified)].map((c) => (
                      <li key={c.person_name} className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${c.verified ? "bg-emerald-50/60" : "bg-amber-50 ring-1 ring-amber-200"}`}>
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar name={c.person_name} ring={c.verified ? "green" : "amber"} />
                          <span className="min-w-0">
                            <span className="block truncate font-bold">{c.person_name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              Says paid {formatDate(c.marked_paid_at.slice(0, 10), { day: "numeric", month: "short" })}
                              {c.option_key !== trip.planId && ` · for ${trip.options?.find((o) => o.id === c.option_key)?.name ?? c.option_key}, not the plan`}
                            </span>
                          </span>
                        </span>
                        {c.verified ? (
                          <Badge tone="green">✓ Verified</Badge>
                        ) : (
                          <Button variant="success" size="sm" disabled={!!busy} onClick={() => act(c.person_name, "verify", { member: c.person_name })}>
                            {busy === c.person_name ? "…" : `Got ${rupees(trip.advanceAmount)}`}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {trip.status !== "collecting" && trip.options && trip.options.length > 0 && (
              <Card className="animate-rise">
                <Eyebrow>Options</Eyebrow>
                <h3 className="mt-1 text-lg font-extrabold">Top {trip.options.length}, ranked by fit</h3>
                <div className="mt-4">
                  <OptionTiles trip={trip} />
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="mb-3 text-sm font-bold">Fit view</p>
                  <FitMatrix options={trip.options} planId={trip.planId} vetoed={trip.vetoedOptionIds} />
                </div>
              </Card>
            )}

            {w && <DatesCard window={w} total={trip.members.length} />}
          </div>

          <aside className="space-y-5">
            {groupUrl && (
              <Card className="animate-rise">
                <h3 className="font-extrabold">Group link</h3>
                <p className="mb-3 mt-1 text-sm text-slate-600">One link for everyone. Share it in your WhatsApp group.</p>
                <LinkBox url={groupUrl} />
                <WhatsAppButton
                  className="mt-3 w-full"
                  text={
                    trip.status === "collecting"
                      ? `Let's actually do this trip 🧳 Add your dates & budget here. Takes 1 min, and answers lock:\n${groupUrl}`
                      : `Options are out for ${trip.name}! Check the plan and pay the advance to lock your spot:\n${groupUrl}`
                  }
                />
              </Card>
            )}
            <PeopleCard trip={trip} />
            <Card className="animate-rise">
              <h3 className="font-extrabold">Trip settings</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Advance" value={rupees(trip.advanceAmount)} />
                <Row label="Locks at" value={`${trip.minConfirmations} of ${trip.members.length} paid`} />
                <Row label="Your UPI" value={<span className="font-mono">{trip.upiId ?? "Not set"}</span>} />
              </dl>
              <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">🔑 This page&apos;s link is your private key. Don&apos;t share it.</p>
            </Card>
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function NextStep({ n, color, title }: { n: number; color: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold text-white ${color}`}>{n}</span>
      <div>
        <Eyebrow>Your next step</Eyebrow>
        <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}
