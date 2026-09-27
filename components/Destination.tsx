import type { DestinationType, Fit, MemberFit, TripOption } from "@/lib/types";
import { Avatar } from "./ui";

const ART: Record<DestinationType, { gradient: string; emoji: string; label: string }> = {
  beach: { gradient: "from-sky-400 via-cyan-400 to-teal-300", emoji: "🏖️", label: "Beach" },
  mountains: { gradient: "from-indigo-500 via-violet-500 to-sky-400", emoji: "🏔️", label: "Mountains" },
  heritage: { gradient: "from-amber-400 via-orange-400 to-rose-400", emoji: "🏛️", label: "Heritage" },
  nature: { gradient: "from-emerald-500 via-green-400 to-lime-300", emoji: "🌿", label: "Nature" },
};

export function typeArt(t: DestinationType) {
  return ART[t];
}

/** Colourful header strip standing in for a photo. */
export function DestinationArt({ option, size = "lg", children }: { option: TripOption; size?: "sm" | "lg"; children?: React.ReactNode }) {
  const art = ART[option.type];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${art.gradient} ${size === "lg" ? "h-40 sm:h-48" : "h-24"}`}>
      <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/25" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60 Q 60 20 120 55 T 240 50 T 400 40 V100 H0Z" fill="currentColor" />
        <path d="M0 80 Q 80 50 160 75 T 320 70 T 400 65 V100 H0Z" fill="currentColor" />
      </svg>
      <span className={`absolute right-4 top-3 drop-shadow-lg ${size === "lg" ? "text-6xl sm:text-7xl" : "text-4xl"}`} aria-hidden>
        {art.emoji}
      </span>
      {children}
    </div>
  );
}

export const FIT: Record<Fit, { label: string; short: string; icon: string; pill: string; cell: string; dot: string }> = {
  works: { label: "Works", short: "Works", icon: "✓", pill: "bg-emerald-100 text-emerald-800", cell: "bg-emerald-500 text-white", dot: "bg-emerald-500" },
  stretch: { label: "Stretch", short: "Stretch", icon: "~", pill: "bg-amber-100 text-amber-800", cell: "bg-amber-400 text-white", dot: "bg-amber-400" },
  no: { label: "Doesn't work", short: "No", icon: "✕", pill: "bg-rose-100 text-rose-800", cell: "bg-rose-500 text-white", dot: "bg-rose-500" },
};

export function FitPill({ fit }: { fit: Fit }) {
  const s = FIT[fit];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s.pill}`}>
      {s.icon} {s.label}
    </span>
  );
}

/** Stacked bar: how many people each option works / stretches / doesn't work for. */
export function FitBar({ fits }: { fits: MemberFit[] }) {
  const total = Math.max(1, fits.length);
  const count = (f: Fit) => fits.filter((x) => x.fit === f).length;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {(["works", "stretch", "no"] as const).map((f) => (
          <div key={f} className={FIT[f].dot} style={{ width: `${(count(f) / total) * 100}%` }} />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs font-medium text-slate-600">
        <span>
          <b className="text-emerald-700">{count("works")}</b> works
        </span>
        <span>
          <b className="text-amber-700">{count("stretch")}</b> stretch
        </span>
        <span>
          <b className="text-rose-700">{count("no")}</b> doesn&apos;t work
        </span>
      </p>
    </div>
  );
}

export function FitList({ fits }: { fits: MemberFit[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {fits.map((f) => (
        <li key={f.member} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={f.member} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{f.member}</span>
              {f.note && <span className="block truncate text-xs text-slate-500">{f.note}</span>}
            </span>
          </span>
          <FitPill fit={f.fit} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The fit view: one row per person, one column per option. Labels only;
 * nobody's budget or dealbreakers are ever shown.
 */
export function FitMatrix({ options, planId, vetoed }: { options: TripOption[]; planId: string | null; vetoed: string[] }) {
  const members = options[0]?.fits.map((f) => f.member) ?? [];
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr>
              <th className="w-1/3 text-left text-xs font-semibold text-slate-500">Person</th>
              {options.map((o, i) => (
                <th key={o.id} className="px-1 text-center align-bottom">
                  <span className="block text-[11px] font-semibold text-slate-400">#{i + 1}</span>
                  <span
                    className={`block truncate text-xs font-bold ${vetoed.includes(o.id) ? "text-slate-400 line-through" : o.id === planId ? "text-brand-700" : "text-slate-700"}`}
                  >
                    {o.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m}>
                <td className="py-0.5 pr-2">
                  <span className="flex items-center gap-2">
                    <Avatar name={m} size="sm" />
                    <span className="truncate font-semibold">{m}</span>
                  </span>
                </td>
                {options.map((o) => {
                  const f = o.fits.find((x) => x.member === m)?.fit ?? "works";
                  const s = FIT[f];
                  return (
                    <td key={o.id} className="px-1 text-center">
                      <span
                        className={`mx-auto grid h-8 w-full max-w-24 place-items-center rounded-xl text-sm font-extrabold ${s.cell} ${vetoed.includes(o.id) ? "opacity-30" : ""} ${o.id === planId ? "ring-2 ring-brand-300 ring-offset-1" : ""}`}
                        title={`${m}: ${s.label}`}
                      >
                        <span aria-hidden>{s.icon}</span>
                        <span className="sr-only">{s.label}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {(["works", "stretch", "no"] as const).map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${FIT[f].dot}`} /> {FIT[f].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">🔒 Budgets and dealbreakers stay private</span>
      </p>
    </div>
  );
}
