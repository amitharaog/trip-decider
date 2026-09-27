"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { whatsappLink } from "@/lib/api";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Layout ---------- */

export function Shell({ children, right, wide = false }: { children: ReactNode; right?: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className={cx("mx-auto flex h-14 items-center justify-between gap-3 px-4", wide ? "max-w-6xl" : "max-w-3xl")}>
          <Logo />
          {right}
        </div>
      </header>
      <main className={cx("mx-auto w-full px-4 pb-20 pt-6 sm:pt-8", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</main>
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lift">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      </span>
      Trip Decider
    </Link>
  );
}

export function Card({ children, className = "", flush = false }: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white shadow-soft",
        flush ? "overflow-hidden" : "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-bold uppercase tracking-[0.12em] text-slate-500", className)}>{children}</p>;
}

/* ---------- Controls ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-lift hover:from-brand-600 hover:to-brand-700 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
  secondary: "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.98] disabled:text-slate-400",
  ghost: "text-brand-700 hover:bg-brand-50 active:bg-brand-100",
  danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 active:scale-[0.98] disabled:text-slate-400",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-300",
  dark: "bg-ink text-white hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-300",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "min-h-9 px-3 text-sm rounded-xl", md: "min-h-12 px-5 text-[15px] rounded-2xl", lg: "min-h-14 px-6 text-base rounded-2xl" };
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed",
        sizes[size],
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export const inputClass =
  "block w-full min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span aria-hidden>⚠️</span>
      <span>{message}</span>
    </p>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  tone = "brand",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "brand" | "rose";
}) {
  const on = tone === "rose" ? "border-rose-500 bg-rose-50 text-rose-800 ring-4 ring-rose-100" : "border-brand-500 bg-brand-50 text-brand-800 ring-4 ring-brand-100";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition active:scale-[0.98]",
        selected ? on : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "slate", className = "" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "rose" | "brand" | "cyan"; className?: string }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    brand: "bg-brand-100 text-brand-800",
    cyan: "bg-cyan-100 text-cyan-800",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

/* ---------- People ---------- */

const AVATAR_COLORS = [
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-lime-400 to-green-500",
  "from-cyan-400 to-sky-500",
  "from-fuchsia-400 to-pink-500",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function Avatar({ name, size = "md", dim = false, ring }: { name: string; size?: "sm" | "md" | "lg"; dim?: boolean; ring?: "green" | "amber" }) {
  const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      title={name}
      className={cx(
        "relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white",
        sizes[size],
        AVATAR_COLORS[hash(name) % AVATAR_COLORS.length],
        dim && "opacity-35 grayscale",
        ring === "green" && "ring-3 ring-emerald-400 ring-offset-2",
        ring === "amber" && "ring-3 ring-amber-400 ring-offset-2",
      )}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ names, max = 5 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="flex -space-x-2">
      {shown.map((n) => (
        <span key={n} className="rounded-full ring-2 ring-white">
          <Avatar name={n} size="sm" />
        </span>
      ))}
      {names.length > max && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 ring-2 ring-white">
          +{names.length - max}
        </span>
      )}
    </span>
  );
}

/* ---------- Data display ---------- */

export function Stat({ label, value, sub, icon, tone = "brand" }: { label: string; value: ReactNode; sub?: ReactNode; icon: string; tone?: "brand" | "cyan" | "amber" | "green" }) {
  const tones = { brand: "bg-brand-50 text-brand-600", cyan: "bg-cyan-50 text-cyan-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" };
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-soft">
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl", tones[tone])} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-500">{label}</span>
        <span className="block truncate text-lg font-extrabold leading-tight text-ink">{value}</span>
        {sub && <span className="block truncate text-xs text-slate-500">{sub}</span>}
      </span>
    </div>
  );
}

export function ProgressBar({ value, max, tone = "green" }: { value: number; max: number; tone?: "green" | "cyan" }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cx("h-full rounded-full transition-all duration-700", tone === "green" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-cyan-400 to-cyan-600")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({ value, max, size = 120, label }: { value: number; max: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, max));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-extrabold leading-none">
            {value}
            <span className="text-base text-slate-400">/{max}</span>
          </p>
          {label && <p className="mt-1 text-[11px] font-semibold text-slate-500">{label}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sharing ---------- */

export function CopyButton({ text, label = "Copy", variant = "secondary" }: { text: string; label?: string; variant?: Variant }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      className="shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? "✓ Copied" : label}
    </Button>
  );
}

export function LinkBox({ url }: { url: string }) {
  return (
    <div className="flex gap-2">
      <input readOnly value={url} onFocus={(e) => e.target.select()} className={cx(inputClass, "min-w-0 bg-slate-50 font-mono text-sm")} aria-label="Link" />
      <CopyButton text={url} />
    </div>
  );
}

export function WhatsAppButton({ text, children = "Share on WhatsApp", className = "" }: { text: string; children?: ReactNode; className?: string }) {
  return (
    <a
      href={whatsappLink(text)}
      target="_blank"
      rel="noreferrer"
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#1ebe5a] active:scale-[0.98]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      {children}
    </a>
  );
}

/* ---------- Confirm dialog ---------- */

type ConfirmOpts = { title: string; body: ReactNode; confirm: string; tone?: "primary" | "danger" };

/** A promise-based replacement for window.confirm that looks like the rest of the app. */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);

  const ask = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    // Open on the next frame so the dialog renders the new content first.
    requestAnimationFrame(() => ref.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    ref.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  };

  const dialog = (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-3xl bg-white p-0 shadow-2xl"
    >
      {opts && (
        <div className="animate-pop p-6">
          <h2 className="text-lg font-extrabold">{opts.title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-slate-600">{opts.body}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => close(false)}>
              Not yet
            </Button>
            <Button variant={opts.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {opts.confirm}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );

  return [dialog, ask] as const;
}
