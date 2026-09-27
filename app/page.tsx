import CreateTrip from "@/components/CreateTrip";
import { Shell } from "@/components/ui";

const STEPS = [
  { n: 1, title: "Set up", body: "Name the trip, add friends, set the advance.", color: "from-indigo-500 to-violet-500", icon: "🧭" },
  { n: 2, title: "Collect", body: "Everyone answers once, privately. Answers lock.", color: "from-cyan-500 to-sky-500", icon: "📝" },
  { n: 3, title: "Decide", body: "Dates first, then your place or the top 3. One veto each.", color: "from-amber-500 to-orange-500", icon: "⚖️" },
  { n: 4, title: "Commit", body: "Pay a small advance. The trip is on once enough are in.", color: "from-emerald-500 to-teal-500", icon: "🎟️" },
];

export default function Home() {
  return (
    <Shell wide>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <section className="animate-rise lg:sticky lg:top-24 lg:self-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-bold text-brand-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> No more dead WhatsApp polls
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Stop polling.
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Lock the trip.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">
            Everyone shares dates, budget and dealbreakers once, in private. Trip Decider picks the plan everyone can live
            with, and it&apos;s on as soon as enough friends pay a small advance.
          </p>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3 rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-soft backdrop-blur">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${s.color} text-lg shadow-sm`} aria-hidden>
                  {s.icon}
                </span>
                <span>
                  <span className="block text-sm font-extrabold">
                    {s.n}. {s.title}
                  </span>
                  <span className="block text-sm text-slate-600">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <span aria-hidden>🔒</span> Budgets and dealbreakers are never shown to the group. Only &ldquo;works&rdquo;,
            &ldquo;stretch&rdquo; or &ldquo;doesn&apos;t work&rdquo;.
          </p>
        </section>

        <CreateTrip />
      </div>
    </Shell>
  );
}
