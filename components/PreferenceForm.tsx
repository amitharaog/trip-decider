"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { HORIZON_DAYS, MIN_LEAD_DAYS, addDays, formatDate, formatRange, todayIST } from "@/lib/dates";
import { BUDGETS, DEALBREAKERS, DESTINATION_TYPES, type Budget, type DateRange, type Dealbreaker, type DestinationType } from "@/lib/types";
import { Button, Card, Chip, ErrorNote, Eyebrow, inputClass, useConfirm } from "./ui";

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const same = (a: DateRange, b: DateRange) => a.start === b.start && a.end === b.end;

const STEPS = [
  { title: "When can you go?", sub: "Pick every stretch in the next 3 months when you could take 3–4 days off." },
  { title: "What kind of place?", sub: "Pick as many as you'd enjoy." },
  { title: "Your budget", sub: "Per person for stay, food and activities. Travel isn't included." },
  { title: "Any dealbreakers?", sub: "Anything that would make you drop out. Skip if nothing." },
  { title: "Lock it in", sub: "Check your answers. Once you submit, they can't change." },
] as const;

const DEALBREAKER_ICONS: Record<Dealbreaker, string> = { longTravel: "⏱️", flights: "✈️", trekking: "🥾", party: "🪩", cold: "🥶" };
const BUDGET_HINTS: Record<Budget, string> = { under8k: "Hostels & homestays", "8to15k": "Comfy stays", "15to25k": "Nice hotels", "25kplus": "Treat ourselves" };

/** Fri–Sun weekends from a week out until the end of the horizon. */
function upcomingWeekends(today: string): DateRange[] {
  const out: DateRange[] = [];
  let d = addDays(today, MIN_LEAD_DAYS);
  while (new Date(Date.parse(d)).getUTCDay() !== 5) d = addDays(d, 1);
  const last = addDays(today, HORIZON_DAYS);
  while (addDays(d, 2) <= last && out.length < 12) {
    out.push({ start: d, end: addDays(d, 2) });
    d = addDays(d, 7);
  }
  return out;
}

export default function PreferenceForm({ tripId, member, onSubmitted }: { tripId: string; member: string; onSubmitted: (token: string) => void }) {
  const today = todayIST();
  const last = addDays(today, HORIZON_DAYS);
  const weekends = useMemo(() => upcomingWeekends(today), [today]);

  const [step, setStep] = useState(0);
  const [windows, setWindows] = useState<DateRange[]>([]);
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [types, setTypes] = useState<DestinationType[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [dealbreakers, setDealbreakers] = useState<Dealbreaker[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  const valid = [windows.length > 0, types.length > 0, !!budget, true, windows.length > 0 && types.length > 0 && !!budget];
  const customRanges = windows.filter((w) => !weekends.some((x) => same(x, w)));

  function addCustom() {
    if (!custom.start || !custom.end || custom.end < custom.start) return;
    if (!windows.some((w) => same(w, custom))) setWindows([...windows, custom]);
    setCustom({ start: "", end: "" });
  }

  async function submit() {
    const ok = await confirm({
      title: "Lock in your answers?",
      body: "You won't be able to change them later. That's the point: nobody can back out tomorrow.",
      confirm: "Lock them in",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ memberToken: string }>(`/api/trips/${tripId}/responses`, {
        body: { member, windows, destinationTypes: types, budget, dealbreakers },
      });
      onSubmitted(res.memberToken);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function next() {
    if (!valid[step]) return;
    if (step === STEPS.length - 1) submit();
    else setStep(step + 1);
  }

  return (
    <Card flush>
      {dialog}
      <div className="border-b border-slate-100 bg-gradient-to-br from-cyan-50 to-white px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow className="text-collect">Your answers · {step + 1} of {STEPS.length}</Eyebrow>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">🔒 Private</span>
        </div>
        <h2 className="mt-1 text-2xl font-extrabold">{STEPS[step].title}</h2>
        <p className="mt-1 text-sm text-slate-600">{STEPS[step].sub}</p>
        <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => i < step && setStep(i)}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={`h-1.5 rounded-full ${i <= step ? "bg-collect" : "bg-slate-200"} ${i < step ? "cursor-pointer" : "cursor-default"}`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {step === 0 && (
          <div key="dates" className="animate-rise space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Quick pick: weekends</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {weekends.map((w) => {
                  const on = windows.some((x) => same(x, w));
                  return (
                    <button
                      key={w.start}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setWindows(on ? windows.filter((x) => !same(x, w)) : [...windows, w])}
                      className={`rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                        on ? "border-cyan-500 bg-cyan-50 ring-4 ring-cyan-100" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {formatDate(w.start, { month: "short" })} {on && <span className="text-cyan-600">· ✓</span>}
                      </span>
                      <span className="block text-sm font-bold">
                        Fri {formatDate(w.start, { day: "numeric" })} – Sun {formatDate(w.end, { day: "numeric" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Or add a longer stretch</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  From
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    min={today}
                    max={last}
                    value={custom.start}
                    onChange={(e) => setCustom({ start: e.target.value, end: custom.end && custom.end < e.target.value ? "" : custom.end })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  To
                  <input type="date" className={`${inputClass} mt-1`} min={custom.start || today} max={last} value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
                </label>
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-3 w-full" onClick={addCustom} disabled={!custom.start || !custom.end}>
                + Add these dates
              </Button>
              {customRanges.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {customRanges.map((w) => (
                    <li key={`${w.start}-${w.end}`} className="inline-flex items-center gap-1 rounded-full bg-cyan-100 py-1 pl-3 pr-1 text-sm font-semibold text-cyan-900">
                      {formatRange(w.start, w.end)}
                      <button type="button" className="grid h-6 w-6 place-items-center rounded-full hover:bg-cyan-200" aria-label="Remove" onClick={() => setWindows(windows.filter((x) => !same(x, w)))}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {windows.length === 0 ? "Pick at least one." : `${windows.length} date option${windows.length > 1 ? "s" : ""} picked. More options = better odds.`}
            </p>
          </div>
        )}

        {step === 1 && (
          <div key="types" className="animate-rise grid grid-cols-2 gap-3">
            {DESTINATION_TYPES.map((t) => {
              const on = types.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTypes(toggle(types, t.id))}
                  className={`flex flex-col items-center gap-2 rounded-3xl border p-5 text-center transition active:scale-[0.98] ${
                    on ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="text-4xl" aria-hidden>{t.emoji}</span>
                  <span className="text-sm font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div key="budget" className="animate-rise space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {BUDGETS.map((b) => {
                const on = budget === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setBudget(b.id)}
                    className={`rounded-3xl border p-4 text-left transition active:scale-[0.98] ${on ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <span className="block text-lg font-extrabold">{b.label}</span>
                    <span className="block text-xs text-slate-500">{BUDGET_HINTS[b.id]}</span>
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span aria-hidden>🔒</span> Only you see this. The group just sees whether an option works for you.
            </p>
          </div>
        )}

        {step === 3 && (
          <div key="deal" className="animate-rise space-y-3">
            <div className="flex flex-wrap gap-2">
              {DEALBREAKERS.map((d) => (
                <Chip key={d.id} tone="rose" selected={dealbreakers.includes(d.id)} onClick={() => setDealbreakers(toggle(dealbreakers, d.id))}>
                  <span aria-hidden>{DEALBREAKER_ICONS[d.id]}</span> {d.label}
                </Chip>
              ))}
            </div>
            <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span aria-hidden>🔒</span> Private too. Any place that hits one is dropped, without saying whose it was.
            </p>
          </div>
        )}

        {step === 4 && (
          <div key="review" className="animate-rise space-y-2">
            <Review label="Dates" onEdit={() => setStep(0)}>
              {windows.map((w) => formatRange(w.start, w.end)).join(" · ")}
            </Review>
            <Review label="Kind of place" onEdit={() => setStep(1)}>
              {DESTINATION_TYPES.filter((t) => types.includes(t.id)).map((t) => `${t.emoji} ${t.label}`).join("  ")}
            </Review>
            <Review label="Budget" private onEdit={() => setStep(2)}>
              {BUDGETS.find((b) => b.id === budget)?.label}
            </Review>
            <Review label="Dealbreakers" private onEdit={() => setStep(3)}>
              {dealbreakers.length ? DEALBREAKERS.filter((d) => dealbreakers.includes(d.id)).map((d) => d.label).join(", ") : "None"}
            </Review>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <ErrorNote message={error} />
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} disabled={busy}>
                Back
              </Button>
            )}
            <Button type="button" className="flex-1" onClick={next} disabled={!valid[step] || busy}>
              {step < STEPS.length - 1 ? (step === 3 && dealbreakers.length === 0 ? "No dealbreakers →" : "Continue →") : busy ? "Locking in…" : "🔒 Lock in my answers"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Review({ label, children, onEdit, private: isPrivate }: { label: string; children: React.ReactNode; onEdit: () => void; private?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">
          {label} {isPrivate && <span className="font-semibold text-slate-400">· 🔒 only you</span>}
        </p>
        <p className="mt-0.5 text-sm font-semibold">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
        Edit
      </button>
    </div>
  );
}
