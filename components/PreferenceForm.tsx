"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { HORIZON_DAYS, addDays, todayIST } from "@/lib/dates";
import { BUDGETS, DEALBREAKERS, DESTINATION_TYPES, type Budget, type Dealbreaker, type DestinationType } from "@/lib/types";
import { Button, Card, Chip, ErrorNote, inputClass } from "./ui";

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export default function PreferenceForm({
  tripId,
  member,
  onSubmitted,
}: {
  tripId: string;
  member: string;
  onSubmitted: (token: string) => void;
}) {
  const today = todayIST();
  const last = addDays(today, HORIZON_DAYS);
  const [windows, setWindows] = useState([{ start: "", end: "" }]);
  const [types, setTypes] = useState<DestinationType[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [dealbreakers, setDealbreakers] = useState<Dealbreaker[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = windows.every((w) => w.start && w.end) && types.length > 0 && !!budget;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Lock in your answers? You won't be able to change them.")) return;
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

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="border-brand-100 bg-brand-50 text-sm text-stone-700">
        Answer once, honestly. <strong>Answers lock when you submit</strong>. Your budget and dealbreakers stay
        private, and the group only sees whether an option works for you.
      </Card>

      <Card>
        <h2 className="font-bold">When can you go?</h2>
        <p className="mb-3 text-sm text-stone-600">Add every stretch in the next 3 months when you could take 3–4 days.</p>
        <div className="space-y-3">
          {windows.map((w, i) => (
            <div key={i} className="rounded-xl bg-stone-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-stone-600">
                  From
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    min={today}
                    max={last}
                    value={w.start}
                    required
                    onChange={(e) => {
                      const start = e.target.value;
                      setWindows(windows.map((x, j) => (j === i ? { start, end: x.end && x.end < start ? "" : x.end } : x)));
                    }}
                  />
                </label>
                <label className="text-xs font-medium text-stone-600">
                  To
                  <input
                    type="date"
                    className={`${inputClass} mt-1`}
                    min={w.start || today}
                    max={last}
                    value={w.end}
                    required
                    onChange={(e) => setWindows(windows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                  />
                </label>
              </div>
              {windows.length > 1 && (
                <button type="button" className="mt-2 text-sm text-stone-500 underline" onClick={() => setWindows(windows.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" className="mt-1" onClick={() => setWindows([...windows, { start: "", end: "" }])}>
          + Add another range
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">What kind of place? <span className="font-normal text-stone-500">(pick any)</span></h2>
        <div className="flex flex-wrap gap-2">
          {DESTINATION_TYPES.map((t) => (
            <Chip key={t.id} selected={types.includes(t.id)} onClick={() => setTypes(toggle(types, t.id))}>
              {t.emoji} {t.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Budget per person</h2>
        <p className="mb-3 text-sm text-stone-600">For stay, food and activities, not travel. Only you see this.</p>
        <div className="grid grid-cols-2 gap-2">
          {BUDGETS.map((b) => (
            <Chip key={b.id} selected={budget === b.id} onClick={() => setBudget(b.id)}>
              {b.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Dealbreakers</h2>
        <p className="mb-3 text-sm text-stone-600">Anything that would make you drop out. Only you see this.</p>
        <div className="flex flex-wrap gap-2">
          {DEALBREAKERS.map((d) => (
            <Chip key={d.id} selected={dealbreakers.includes(d.id)} onClick={() => setDealbreakers(toggle(dealbreakers, d.id))}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Card>

      <ErrorNote message={error} />
      <Button type="submit" className="w-full" disabled={!complete || busy}>
        {busy ? "Locking in…" : "Lock in my answers"}
      </Button>
      {!complete && <p className="text-center text-xs text-stone-500">Add your dates, a kind of place and a budget to submit.</p>}
    </form>
  );
}
