import Link from "next/link";
import { Shell } from "@/components/ui";

export default function NotFound() {
  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-soft">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="mt-3 text-2xl font-extrabold">Trip not found</h1>
        <p className="mt-2 text-slate-600">Check the link in your WhatsApp group. It might be missing a character.</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-600 px-5 font-semibold text-white shadow-lift hover:bg-brand-700"
        >
          Plan a new trip
        </Link>
      </div>
    </Shell>
  );
}
