"use client";

import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";
import { rupees, upiLink } from "@/lib/api";

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
    QRCode.toString(link, { type: "svg", margin: 1, width: 220 }).then((svg) => live && setQr(svg));
    return () => {
      live = false;
    };
  }, [isPhone, link]);

  if (isPhone === false) {
    return (
      <div className="rounded-xl border border-stone-200 p-3 text-center">
        <p className="text-sm font-semibold">Scan with GPay, PhonePe or Paytm on your phone</p>
        <div
          className="mx-auto mt-2 h-[220px] w-[220px] [&>svg]:h-full [&>svg]:w-full"
          aria-label={`UPI QR code to pay ${rupees(amount)} to ${upiId}`}
          role="img"
          dangerouslySetInnerHTML={qr ? { __html: qr } : undefined}
        />
        <p className="mt-2 text-xs text-stone-500">
          {rupees(amount)} to <span className="font-mono">{upiId}</span>
        </p>
      </div>
    );
  }

  return (
    <>
      <a
        href={link}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-4 font-semibold text-white active:bg-brand-700"
      >
        Pay {rupees(amount)} with UPI
      </a>
      <p className="text-center text-xs text-stone-500">
        Opens GPay / PhonePe / Paytm. Or pay to <span className="font-mono">{upiId}</span>
      </p>
    </>
  );
}
