import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminView from "@/components/AdminView";
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        <h1 className="text-lg font-bold">This admin link isn&apos;t valid</h1>
        <p className="mt-1 text-sm">Use the full private link you got when you created the trip.</p>
      </div>
    );
  }
  return <AdminView initial={await adminState(trip)} />;
}
