"use client";

import { useState } from "react";
import { api, rupees } from "@/lib/api";
import { DESTINATIONS, MAX_SHORTLIST } from "@/lib/destinations";
import { typeArt } from "./Destination";
import { Avatar, Button, Card, ErrorNote, Eyebrow, Field, LinkBox, WhatsAppButton, inputClass } from "./ui";

type Created = { id: string; adminToken: string; name: string };
const DEMO_NAME = "Finally, the long weekend";
const ADVANCES = [1000, 2000, 3000, 5000];
const STEPS = ["The trip", "Where to?", "The crew", "The commitment"] as const;

/** A destination named in the trip title, e.g. "Wayanad weekend" → Wayanad. */
function placeInName(name: string) {
  const n = name.toLowerCase();
  return DESTINATIONS.find((d) => n.includes(d.id) || n.includes(d.name.toLowerCase().split(/[ ,&]/)[0]));
}

export default function CreateTrip() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  // null = let the app suggest from every place; otherwise the organizer's shortlist.
  const [places, setPlaces] = useState<string[] | null>(null);
  const [members, setMembers] = useState(["", "", "", ""]);
  const [upiId, setUpiId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState(2000);
  const [minConfirmations, setMinConfirmations] = useState(3);
  const [busy, setBusy] = useState<"create" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const friends = members.map((m) => m.trim()).filter(Boolean);
  const crew = [organizerName.trim() || "You", ...friends];
  const minOk = Math.min(Math.max(1, minConfirmations), crew.length);

  const canNext = [name.trim() && organizerName.trim(), places === null || places.length > 0, friends.length > 0, upiId.trim() && advanceAmount > 0][step];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (!canNext) return;
      // Trip called "Wayanad trip"? Start the next step with Wayanad picked.
      if (step === 0 && places === null) {
        const named = placeInName(name);
        if (named) setPlaces([named.id]);
      }
      setStep(step + 1);
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const res = await api<{ id: string; adminToken: string }>("/api/trips", {
        body: { name, organizerName, members: friends, upiId, advanceAmount, minConfirmations: minOk, destinations: places ?? [] },
      });
      setCreated({ ...res, name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy("demo");
    setError(null);
    try {
      const res = await api<{ id: string; adminToken: string }>("/api/trips/demo", { method: "POST" });
      setCreated({ ...res, name: DEMO_NAME });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (created) return <Ready created={created} onReset={() => { setCreated(null); setStep(0); }} />;

  return (
    <div className="animate-rise space-y-4 [animation-delay:80ms]">
      <form onSubmit={submit}>
        <Card flush>
          <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white px-5 py-5 sm:px-7">
            <Eyebrow className="text-brand-600">Plan a trip · step {step + 1} of {STEPS.length}</Eyebrow>
            <h2 className="mt-1 text-2xl font-extrabold">{STEPS[step]}</h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`h-1.5 rounded-full transition ${i <= step ? "bg-brand-500" : "bg-slate-200"} ${i < step ? "cursor-pointer" : "cursor-default"}`}
                  aria-label={`Step ${i + 1}: ${s}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-7">
            {step === 0 && (
              <div key="s0" className="animate-rise space-y-5">
                <Field label="What's the trip called?">
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa or bust 🌴" maxLength={80} autoFocus />
                </Field>
                <Field label="Your name" hint="You're the organizer. You'll get a private admin link.">
                  <input className={inputClass} value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} placeholder="Riya" maxLength={40} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div key="s1" className="animate-rise space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { on: places === null, label: "Let the app suggest", sub: `Top 3 from ${DESTINATIONS.length} places`, icon: "✨", click: () => setPlaces(null) },
                    { on: places !== null, label: "I know where", sub: `Pick 1 to ${MAX_SHORTLIST} places`, icon: "📍", click: () => places === null && setPlaces([]) },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={o.on}
                      onClick={o.click}
                      className={`rounded-3xl border p-4 text-left transition active:scale-[0.98] ${o.on ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <span className="text-2xl" aria-hidden>{o.icon}</span>
                      <span className="mt-1 block text-sm font-extrabold">{o.label}</span>
                      <span className="block text-xs text-slate-500">{o.sub}</span>
                    </button>
                  ))}
                </div>

                {places === null ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Everyone&apos;s budget, place type and dealbreakers decide the top 3. Good when the group hasn&apos;t picked anywhere yet.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      {places.length === 0
                        ? "Tap the places that are on the table."
                        : `Friends are asked "${organizerName.trim() || "You"} is keen on ${places.length === 1 ? DESTINATIONS.find((d) => d.id === places[0])?.name : "these places"}. Are you in?" Anyone who says no picks where they'd rather go, and the app ranks it all.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {DESTINATIONS.map((d) => {
                        const on = places.includes(d.id);
                        const full = !on && places.length >= MAX_SHORTLIST;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            aria-pressed={on}
                            disabled={full}
                            onClick={() => setPlaces(on ? places.filter((x) => x !== d.id) : [...places, d.id])}
                            className={`relative rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] disabled:opacity-40 ${
                              on ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <span className="block truncate text-sm font-bold">
                              <span aria-hidden>{typeArt(d.type).emoji}</span> {d.name}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500">
                              ₹{d.cost[0] / 1000}–{d.cost[1] / 1000}k · ~{d.travelHours}h
                            </span>
                            {on && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div key="s2" className="animate-rise">
                <p className="mb-3 text-sm text-slate-600">Who&apos;s coming? Just first names, as they&apos;ll recognise them.</p>
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {m.trim() ? <Avatar name={m.trim()} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-slate-200 text-slate-300">?</span>}
                      <input
                        className={inputClass}
                        value={m}
                        maxLength={40}
                        placeholder={`Friend ${i + 1}`}
                        autoFocus={i === 0}
                        onChange={(e) => setMembers(members.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      {members.length > 1 && (
                        <button
                          type="button"
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label={`Remove friend ${i + 1}`}
                          onClick={() => setMembers(members.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setMembers([...members, ""])} disabled={members.length >= 19}>
                  + Add a friend
                </Button>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="flex -space-x-2">
                    {crew.slice(0, 8).map((n, i) => (
                      <span key={`${n}-${i}`} className="rounded-full ring-2 ring-slate-50">
                        <Avatar name={n} size="sm" />
                      </span>
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{crew.length} people including you</span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div key="s3" className="animate-rise space-y-6">
                <Field label="Your UPI ID" hint="Friends pay the advance straight to you. No payment gateway, no fees.">
                  <input
                    className={inputClass}
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="riya@okhdfcbank"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoFocus
                  />
                </Field>

                <div>
                  <p className="mb-1.5 text-sm font-semibold text-slate-700">Advance per person</p>
                  <div className="flex flex-wrap gap-2">
                    {ADVANCES.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAdvanceAmount(a)}
                        aria-pressed={advanceAmount === a}
                        className={`min-h-11 rounded-2xl border px-4 text-sm font-bold transition ${
                          advanceAmount === a ? "border-brand-500 bg-brand-50 text-brand-800 ring-4 ring-brand-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {rupees(a)}
                      </button>
                    ))}
                    <label className="relative">
                      <span className="sr-only">Custom amount</span>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={advanceAmount || ""}
                        onChange={(e) => setAdvanceAmount(Math.max(0, Math.floor(Number(e.target.value))))}
                        className={`${inputClass} min-h-11 w-28 pl-7 text-sm font-bold`}
                      />
                    </label>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Small enough to pay today, big enough that nobody backs out tomorrow.</p>
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-semibold text-slate-700">The trip is on once this many have paid</p>
                  <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3">
                    <Button type="button" variant="secondary" size="sm" className="h-11 w-11 text-lg" onClick={() => setMinConfirmations(Math.max(1, minOk - 1))} aria-label="Fewer">
                      −
                    </Button>
                    <p className="flex-1 text-center">
                      <span className="text-3xl font-extrabold">{minOk}</span>
                      <span className="text-slate-500"> of {crew.length}</span>
                    </p>
                    <Button type="button" variant="secondary" size="sm" className="h-11 w-11 text-lg" onClick={() => setMinConfirmations(Math.min(crew.length, minOk + 1))} aria-label="More">
                      +
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Don&apos;t wait for everyone. The trip goes ahead with whoever commits.</p>
                </div>
              </div>
            )}

            <ErrorNote message={error} />

            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={!canNext || !!busy}>
                {step < STEPS.length - 1 ? "Continue →" : busy === "create" ? "Creating…" : "Create trip 🎉"}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-4 sm:flex-row">
        <p className="text-center text-sm text-slate-600 sm:text-left">
          <b className="text-ink">Just looking?</b> Open a sample trip with Riya and 4 friends.
        </p>
        <Button variant="dark" size="sm" onClick={loadDemo} disabled={!!busy} className="shrink-0">
          {busy === "demo" ? "Loading…" : "Try the demo →"}
        </Button>
      </div>
    </div>
  );
}

function Ready({ created, onReset }: { created: Created; onReset: () => void }) {
  const origin = window.location.origin;
  const group = `${origin}/t/${created.id}`;
  const admin = `${origin}/t/${created.id}/admin?token=${created.adminToken}`;
  return (
    <div className="animate-rise space-y-4">
      <Card flush>
        <div className="bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-500 px-6 py-7 text-white">
          <p className="animate-pop text-4xl">🎉</p>
          <h2 className="mt-2 text-2xl font-extrabold">&ldquo;{created.name}&rdquo; is ready</h2>
          <p className="mt-1 text-white/85">Send the group link to your friends. It takes them a minute.</p>
        </div>
        <div className="space-y-3 p-6">
          <Eyebrow>Group link</Eyebrow>
          <LinkBox url={group} />
          <WhatsAppButton className="w-full" text={`Let's actually do this trip 🧳 Add your dates & budget here. Takes 1 min, and answers lock:\n${group}`} />
        </div>
      </Card>

      <Card className="border-amber-200! bg-amber-50!">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🔑</span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="font-extrabold text-amber-950">Your private organizer link</h3>
              <p className="text-sm text-amber-900">Bookmark it now and don&apos;t share it. It&apos;s how you close collection, finalise the plan and verify payments.</p>
            </div>
            <LinkBox url={admin} />
            <a href={admin} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-amber-500 px-5 font-bold text-white shadow-sm hover:bg-amber-600">
              Open my dashboard →
            </a>
          </div>
        </div>
      </Card>

      <Button variant="ghost" className="w-full" onClick={onReset}>
        Plan another trip
      </Button>
    </div>
  );
}
