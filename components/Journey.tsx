import type { TripStatus } from "@/lib/types";

const STAGES = [
  { key: "setup", label: "Set up", hint: "Trip created", color: "bg-setup", text: "text-setup", ring: "ring-indigo-100" },
  { key: "collect", label: "Collect", hint: "Private answers", color: "bg-collect", text: "text-collect", ring: "ring-cyan-100" },
  { key: "decide", label: "Decide", hint: "Plan + one veto each", color: "bg-decide", text: "text-decide", ring: "ring-amber-100" },
  { key: "commit", label: "Commit", hint: "Pay the advance", color: "bg-commit", text: "text-commit", ring: "ring-emerald-100" },
] as const;

const CURRENT: Record<TripStatus, number> = { collecting: 1, deciding: 2, confirming: 3, locked: 4 };

/** The four stages from the product flow, with the current one highlighted. */
export default function Journey({ status }: { status: TripStatus }) {
  const current = CURRENT[status];
  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:gap-3" aria-label="Trip progress">
      {STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="min-w-0" aria-current={active ? "step" : undefined}>
            <div className={`h-1.5 rounded-full transition-colors ${done || active ? s.color : "bg-slate-200"} ${active ? "animate-pulse" : ""}`} />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                  done ? `${s.color} text-white` : active ? `bg-white ${s.text} ring-4 ${s.ring} border-2 border-current` : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`truncate text-xs font-bold sm:text-sm ${active ? "text-ink" : done ? "text-slate-600" : "text-slate-400"}`}>{s.label}</span>
            </div>
            <p className="mt-0.5 hidden truncate pl-6.5 text-xs text-slate-500 sm:block">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
