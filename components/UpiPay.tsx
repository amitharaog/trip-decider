"use client";

import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";
import { rupees, upiLink } from "@/lib/api";
import { CopyButton } from "./ui";

// Phones get a button that opens their UPI app. Laptops have no UPI app (the
// link would open whatever claims upi://, e.g. WhatsApp), so they get a QR
// code to scan with a phone instead.
const TOUCH = "(pointer: coarse)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(TOUCH);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function UpiPay({ upiId, payee, amount, note }: { upiId: string; payee: string; amount: number; note: string }) {
  const link = upiLink(upiId, payee, amount, note);
  const isPhone = useSyncExternalStore(subscribe, () => window.matchMedia(TOUCH).matches, () => null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (isPhone !== false) return;
    let live = true;
    QRCode.toString(link, { type: "svg", margin: 1, width: 200 }).then((svg) => live && setQr(svg));
    return () => {
      live = false;
    };
  }, [isPhone, link]);

  const payTo = (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="min-w-0 text-xs text-slate-500">
        Pay to <span className="block truncate font-mono text-sm font-semibold text-ink">{upiId}</span>
      </span>
      <CopyButton text={upiId} label="Copy ID" />
    </div>
  );

  if (isPhone === false) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 p-4 sm:flex-row">
          <div
            className="h-[160px] w-[160px] shrink-0 rounded-2xl bg-white p-1 ring-1 ring-slate-200 [&>svg]:h-full [&>svg]:w-full"
            aria-label={`UPI QR code to pay ${rupees(amount)} to ${upiId}`}
            role="img"
            dangerouslySetInnerHTML={qr ? { __html: qr } : undefined}
          />
          <div className="text-center sm:text-left">
            <p className="text-2xl font-extrabold">{rupees(amount)}</p>
            <p className="mt-1 text-sm font-semibold">Scan with GPay, PhonePe or Paytm</p>
            <p className="mt-1 text-xs text-slate-500">Open your UPI app on your phone and scan this code.</p>
          </div>
        </div>
        {payTo}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={link}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 text-base font-bold text-white shadow-sm active:scale-[0.98]"
      >
        Pay {rupees(amount)} with UPI
      </a>
      <p className="text-center text-xs text-slate-500">Opens GPay, PhonePe or Paytm</p>
      {payTo}
    </div>
  );
}
