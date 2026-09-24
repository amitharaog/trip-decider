import CreateTrip from "@/components/CreateTrip";

export default function Home() {
  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Trip Decider</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">Stop polling. Pick a trip and pay the advance.</h1>
        <p className="mt-2 text-stone-600">
          Everyone adds dates, budget and dealbreakers once, and answers can&apos;t change the next day. The app picks
          the plan, and the trip is on once enough people have paid.
        </p>
      </header>
      <CreateTrip />
    </>
  );
}
