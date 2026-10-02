"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/client";
export function usePaymentReturn(projectId: string | undefined, onConfirmed: () => void) {
  const [state, setState] = useState(""), [error, setError] = useState(""), [checking, setChecking] = useState(false);
  const key = useRef(""), callback = useRef(onConfirmed), running = useRef(false);
  callback.current = onConfirmed;
  async function check() {
    if (!projectId || !key.current || running.current) return;
    running.current = true; setChecking(true); setError("");
    try {
      const result = await api<{ state: string }>(`/api/projects/${projectId}/payment-status?checkout=${encodeURIComponent(key.current)}`);
      setState(result.state);
      if (result.state === "confirmed") { key.current = ""; callback.current(); }
    } catch (error) { setError((error as Error).message); }
    finally { running.current = false; setChecking(false); }
  }
  useEffect(() => {
    const query = new URLSearchParams(location.search), payment = query.get("payment");
    key.current = query.get("checkout") || "";
    if (payment === "cancelled") { setState("cancelled"); return; }
    if (payment !== "processing") return;
    setState(key.current ? "processing" : "unknown");
    let attempts = 0;
    const timer = setInterval(() => { if (++attempts >= 20) clearInterval(timer); void check(); }, 3000);
    void check();
    return () => clearInterval(timer);
  }, [projectId]);
  return { state, error, checking, check, blocked: ["processing", "unknown"].includes(state) };
}
export default function PaymentReturn({ payment }: { payment: ReturnType<typeof usePaymentReturn> }) {
  if (!payment.state) return null;
  const messages: Record<string, string> = {
    processing: "Your payment is being confirmed. Keep this page open. Your next project step appears when confirmation arrives.",
    confirmed: "Payment confirmed. Your project has been updated.",
    cancelled: "You left checkout. Your brief is saved. You can return to secure checkout when you are ready.",
    expired: "This checkout expired without a confirmed payment. You can start a new checkout.",
    unknown: "This checkout could not be matched to a payment. Check Billing before paying again. If confirmation is delayed, contact Fourthform through your project.",
  };
  return <section className="recovery-notice" aria-label="Payment status"><p role="status">{messages[payment.state]}</p>{payment.blocked && <button disabled={payment.checking} onClick={() => void payment.check()}>{payment.checking ? "Checking payment…" : "Check confirmation"}</button>}{payment.error && <p role="alert">{payment.error}</p>}</section>;
}
