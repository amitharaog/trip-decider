import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MemberView from "@/components/MemberView";
import { getTrip, publicState } from "@/lib/trips";

export async function generateMetadata(props: PageProps<"/t/[id]">): Promise<Metadata> {
  const trip = await getTrip((await props.params).id);
  if (!trip) return { title: "Trip not found" };
  return {
    title: `${trip.name} · Trip Decider`,
    description: `${trip.organizer_name} is planning a trip. Add your dates and budget. Takes a minute.`,
    openGraph: { title: trip.name, description: `${trip.organizer_name} is planning a trip. Add your dates and budget.` },
  };
}

export default async function TripPage(props: PageProps<"/t/[id]">) {
  const trip = await getTrip((await props.params).id);
  if (!trip) notFound();
  return <MemberView initial={await publicState(trip)} />;
}
