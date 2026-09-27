import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminView from "@/components/AdminView";
import { Shell } from "@/components/ui";
import { safeEqual } from "@/lib/http";
import { adminState, getTrip } from "@/lib/trips";

export const metadata: Metadata = { title: "Organizer · Trip Decider", robots: { index: false } };

export default async function AdminPage(props: PageProps<"/t/[id]/admin">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const token = typeof query.token === "string" ? query.token : null;
  const trip = await getTrip(id);
  if (!trip) notFound();
  if (!safeEqual(trip.admin_token, token)) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-soft">
          <p className="text-5xl" aria-hidden>🔑</p>
          <h1 className="mt-3 text-xl font-extrabold">This organizer link isn&apos;t valid</h1>
          <p className="mt-2 text-sm text-slate-600">Use the full private link you got when you created the trip.</p>
          <a href={`/t/${id}`} className="mt-5 inline-block text-sm font-bold text-brand-700 underline">
            Open the group page instead
          </a>
        </div>
      </Shell>
    );
  }
  return <AdminView initial={await adminState(trip)} />;
}
