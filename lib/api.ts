// Browser-side helper for calling our own API routes. Never talks to Supabase.
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
}

export function upiLink(upiId: string, payeeName: string, amount: number, note: string) {
  const e = encodeURIComponent;
  return `upi://pay?pa=${e(upiId)}&pn=${e(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${e(note.slice(0, 50))}`;
}

export function whatsappLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
