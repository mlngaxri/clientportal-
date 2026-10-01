"use client";
import { useState, useRef } from "react";
export default function ContactForm({
  projectId,
  pageId,
  review = false,
}: {
  projectId: string;
  pageId: string;
  review?: boolean;
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ key: string; payload: string } | null>(null);
  return (
    <form
      id="contact"
      className="customer-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (review) {
          setStatus(
            "The contact form becomes available when this website launches.",
          );
          return;
        }
        const form = e.currentTarget,
          values = new FormData(form);
        const payload = {
            pageId,
            name: values.get("name"),
            email: values.get("email"),
            message: values.get("message"),
            website: values.get("website"),
          },
          serialized = JSON.stringify(payload);
        if (pending.current?.payload !== serialized)
          pending.current = { key: crypto.randomUUID(), payload: serialized };
        setBusy(true);
        setStatus("");
        try {
          const r = await fetch(`/api/forms/${projectId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: pending.current.key, ...payload }),
            signal: AbortSignal.timeout(30000),
          });
          const data = await r.json();
          if (!r.ok)
            throw new Error(
              data.error || "Your message could not be sent. Try again.",
            );
          setStatus(
            "Your message has been received. Thank you for getting in touch.",
          );
          form.reset();
          pending.current = null;
        } catch (err) {
          setStatus(
            err instanceof Error && err.name === "TimeoutError"
              ? "The connection timed out. Try sending this message again."
              : (err as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="customer-eyebrow">Get in touch</span>
      <h2>Start a conversation.</h2>
      <fieldset disabled={busy}>
        <label>
          Your name
          <input name="name" autoComplete="name" required maxLength={160} />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Your message
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
          />
        </label>
        <label className="customer-honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <button type="submit">{busy ? "Sending…" : "Send message ↗"}</button>
      </fieldset>
      {status && <p role="status">{status}</p>}
    </form>
  );
}
