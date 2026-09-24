"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { whatsappLink } from "@/lib/api";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Only apply the default colours when the caller doesn't set its own.
  const bg = /\bbg-/.test(className) ? "" : "bg-white";
  const border = /\bborder-(?!2\b|dashed\b)[a-z]/.test(className) ? "" : "border-stone-200";
  return <section className={`rounded-2xl border p-4 shadow-sm ${bg} ${border} ${className}`}>{children}</section>;
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white active:bg-brand-700 disabled:bg-stone-300",
  secondary: "border border-stone-300 bg-white text-stone-800 active:bg-stone-100 disabled:text-stone-400",
  ghost: "text-brand-700 active:bg-brand-50",
  danger: "border border-red-300 bg-white text-red-700 active:bg-red-50 disabled:text-stone-400",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-semibold transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "block w-full min-h-12 rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
        selected ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700 active:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

export function CopyLink({ label, url, shareText }: { label: string; url: string; shareText?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className={`${inputClass} min-w-0 text-sm`} />
        <Button
          variant="secondary"
          className="shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {shareText && (
        <a
          href={whatsappLink(`${shareText}\n${url}`)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-4 font-semibold text-white active:opacity-90"
        >
          Share on WhatsApp
        </a>
      )}
    </div>
  );
}
