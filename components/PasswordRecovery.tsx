"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "../lib/client";
export default function PasswordRecovery({
  update = false,
}: {
  update?: boolean;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const passwordMismatch = error === "The passwords do not match.";
  async function submit() {
    if (update && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/account", {
        action: update ? "password" : "recovery",
        email,
        password,
      });
      setDone(true);
      setPassword("");
      setConfirmation("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="start-page">
      <header className="start-topbar">
        <Link className="wordmark" href="/">
          fourthform
        </Link>
        <Link href="/start?mode=signin">Sign in</Link>
      </header>
      <section className="account-panel">
        <h1>{update ? "Choose a new password." : "Reset your password."}</h1>
        {done ? (
          <p role="status">
            {update
              ? "Your password has been updated. You can return to your projects."
              : "If this address has an account, a recovery link will arrive shortly. Open it in this browser."}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {update ? (
              <>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    aria-invalid={passwordMismatch || undefined}
                    aria-describedby={passwordMismatch ? "password-error" : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-invalid={passwordMismatch || undefined}
                    aria-describedby={passwordMismatch ? "password-error" : undefined}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            <button type="submit" className="primary" disabled={busy}>
              {busy
                ? "Working…"
                : update
                  ? "Save password"
                  : "Send recovery link"}
            </button>
          </form>
        )}
        {error && <p id="password-error" role="alert">{error}</p>}
        {done && update && <Link href="/app">Return to projects</Link>}
      </section>
    </main>
  );
}
