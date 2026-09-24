import type { Fit, MemberFit } from "@/lib/types";

const STYLE: Record<Fit, { label: string; className: string; icon: string }> = {
  works: { label: "Works", className: "bg-green-100 text-green-800", icon: "✓" },
  stretch: { label: "Stretch", className: "bg-amber-100 text-amber-800", icon: "~" },
  no: { label: "Doesn't work", className: "bg-red-100 text-red-800", icon: "✕" },
};

export function FitSummary({ fits }: { fits: MemberFit[] }) {
  const count = (f: Fit) => fits.filter((x) => x.fit === f).length;
  return (
    <p className="text-sm text-stone-600">
      {count("works")} works · {count("stretch")} stretch · {count("no")} doesn&apos;t work
    </p>
  );
}

export default function FitList({ fits }: { fits: MemberFit[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {fits.map((f) => {
        const s = STYLE[f.fit];
        return (
          <li key={f.member} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="font-medium">{f.member}</span>
              {f.note && <span className="block text-xs text-stone-500">{f.note}</span>}
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>
              {s.icon} {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
