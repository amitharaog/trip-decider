"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, CopyLink, ErrorNote, Field, inputClass } from "./ui";

type Created = { id: string; adminToken: string; name: string };

export default function CreateTrip() {
  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [members, setMembers] = useState(["", "", ""]);
  const [upiId, setUpiId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("2000");
  const [minConfirmations, setMinConfirmations] = useState("3");
  const [busy, setBusy] = useState<"create" | "demo" | null>(null);
  const [error, setError] = useState<{ from: "create" | "demo"; message: string } | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError(null);
    try {
      const res = await api<{ id: string; adminToken: string }>("/api/trips", {
        body: {
          name,
          organizerName,
          members: members.filter((m) => m.trim()),
          upiId,
          advanceAmount: Number(advanceAmount),
          minConfirmations: Number(minConfirmations),
        },
      });
      setCreated({ ...res, name });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError({ from: "create", message: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy("demo");
    setError(null);
    try {
      const res = await api<{ id: string; adminToken: string }>("/api/trips/demo", { method: "POST" });
      setCreated({ ...res, name: "Finally, the long weekend" });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError({ from: "demo", message: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (created) {
    const origin = window.location.origin;
    const group = `${origin}/t/${created.id}`;
    const admin = `${origin}/t/${created.id}/admin?token=${created.adminToken}`;
    return (
      <div className="space-y-4">
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">“{created.name}” is ready 🎉</h2>
          <CopyLink
            label="Group link: send this to the WhatsApp group"
            url={group}
            shareText={`Let's actually do this trip. Add your dates & budget here (takes 1 min, answers lock):`}
          />
        </Card>
        <Card className="space-y-3 border-amber-300 bg-amber-50">
          <CopyLink label="Your private admin link: don't share it" url={admin} />
          <p className="text-sm text-amber-800">
            Save or bookmark this link now. It&apos;s the only way to close collection and verify payments.
          </p>
          <a href={admin} className="block text-center font-semibold text-brand-700 underline">
            Open admin page →
          </a>
        </Card>
        <Button variant="secondary" className="w-full" onClick={() => setCreated(null)}>
          Create another trip
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-3 border-dashed">
        <p className="text-sm text-stone-600">Just looking? Load a sample trip with 5 friends.</p>
        <Button variant="secondary" onClick={loadDemo} disabled={!!busy} className="shrink-0">
          {busy === "demo" ? "Loading…" : "Load demo trip"}
        </Button>
      </Card>
      {error?.from === "demo" && <ErrorNote message={error.message} />}

      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-4">
          <Field label="Trip name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa or bust" required maxLength={80} />
          </Field>
          <Field label="Your name">
            <input className={inputClass} value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} placeholder="Riya" required maxLength={40} />
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">Friends coming along</p>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputClass}
                    value={m}
                    maxLength={40}
                    placeholder={`Friend ${i + 1}`}
                    onChange={(e) => setMembers(members.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  {members.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove friend ${i + 1}`}
                      onClick={() => setMembers(members.filter((_, j) => j !== i))}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-1" onClick={() => setMembers([...members, ""])}>
              + Add friend
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <Field label="Your UPI ID" hint="Friends pay the advance straight to you.">
            <input
              className={inputClass}
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="riya@okhdfcbank"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Advance (₹)">
              <input className={inputClass} type="number" inputMode="numeric" min={1} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} required />
            </Field>
            <Field label="Min. paid to lock">
              <input className={inputClass} type="number" inputMode="numeric" min={1} value={minConfirmations} onChange={(e) => setMinConfirmations(e.target.value)} required />
            </Field>
          </div>
        </Card>

        {error?.from === "create" && <ErrorNote message={error.message} />}
        <Button type="submit" className="w-full" disabled={!!busy}>
          {busy === "create" ? "Creating…" : "Create trip"}
        </Button>
      </form>
    </div>
  );
}
