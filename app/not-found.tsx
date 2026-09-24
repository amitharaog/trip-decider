import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-bold">Trip not found</h1>
      <p className="text-stone-600">Check the link in your WhatsApp group.</p>
      <Link href="/" className="font-semibold text-brand-700 underline">Plan a new trip</Link>
    </div>
  );
}
