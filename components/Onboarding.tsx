"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import PaymentReturn, { usePaymentReturn } from "./PaymentReturn";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { api } from "../lib/client";
import { initialObjects, type Project } from "../lib/model";
import { SaveControl } from "./useSave";
export default function Onboarding({
  signedIn,
  returnTo = "/start",
  project: initial,
  configurationReady,
  googleReady = false,
  initialMode = "signup",
  createNew = false,
  reference,
  requestedPackage = "SITE",
}: {
  signedIn: boolean;
  returnTo?: string;
  project: Project | null;
  configurationReady: boolean;
  googleReady?: boolean;
  initialMode?: "signin" | "signup";
  createNew?: boolean;
  reference?: { id: string; title: string; url: string };
  requestedPackage?: "SITE" | "FIRST";
}) {
  const [packageName, setPackageName] = useState(
    initial?.package || requestedPackage,
  );
  const [openedOn, setOpenedOn] = useState(
    String(initial?.brief.openedOn || ""),
  );
  const [includeReference, setIncludeReference] = useState(!!reference);
  const [project, setProject] = useState(initial),
    [step, setStep] = useState(
      !signedIn ? 1 : initial?.phase === "AWAITING_INITIAL_PAYMENT" ? 3 : 2,
    ),
    [mode, setMode] = useState(initialMode),
    [remember, setRemember] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(
      initial?.name === "Your website" ? "" : initial?.name || "",
    ),
    [description, setDescription] = useState(
      String(initial?.brief.description || ""),
    ),
    [links, setLinks] = useState(String(initial?.brief.links || "")),
    [goals, setGoals] = useState<string[]>(
      (initial?.brief.goals as string[]) || [],
    ),
    [feel, setFeel] = useState(String(initial?.brief.feel || "")),
    [state, setState] = useState("saved"),
    [error, setError] = useState(""),
    [authNotice, setAuthNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useUnsavedGuard(state !== "saved");
  const payment = usePaymentReturn(project?.id, () => window.location.assign(`/projects/${project?.id}/overview`));
  const saving = useRef(false);
  const pending = useRef<{ serial: string; key: string } | null>(null);
  const recoveryKey = `fourthform:onboarding:${initial?.id || "new"}`;
  const [recovery, setRecovery] = useState<any>(null);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    try {
      const cached = JSON.parse(localStorage.getItem(recoveryKey) || "null");
      if (
        cached &&
        typeof cached.name === "string" &&
        typeof cached.description === "string" &&
        Array.isArray(cached.goals) &&
        typeof cached.links === "string" &&
        typeof cached.feel === "string"
      )
        setRecovery(cached);
    } catch {
      /* Saving remains available when device storage is disabled. */
    }
    setRecoveryLoaded(true);
  }, [recoveryKey, signedIn]);
  useEffect(() => {
    if (!recoveryLoaded || recovery || state === "saved") return;
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({
          name,
          description,
          links,
          goals,
          feel,
          packageName,
          openedOn,
          includeReference,
        }),
      );
    } catch {}
  }, [
    name,
    description,
    links,
    goals,
    feel,
    state,
    recoveryKey,
    recoveryLoaded,
    recovery,
    packageName,
    openedOn,
    includeReference,
  ]);
  const creationKey = useRef<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmationSent, setConfirmationSent] = useState(false);
  async function auth(google = false, resend = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setAuthNotice("");
    try {
      const r = await api("/api/auth", {
        mode: resend ? "confirmation" : google ? "google" : mode,
        ...(!google ? { email, ...(!resend ? { password } : {}) } : {}),
        remember,
        next: returnTo,
      });
      if (r.confirmationRequired) {
        setConfirmationSent(true);
        setAuthNotice(`Confirmation sent to ${email}. Open the link in this browser to return to your selected package and reference. Check spam if it does not arrive.`);
      } else {
        window.location.assign(r.url || returnTo);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(next = false, exit = false) {
    if (saving.current || recovery) return;
    const issues: Record<string, string> = {};
    if (!name.trim()) issues.name = "Enter your business name.";
    if (!description.trim()) issues.description = "Describe what your business offers.";
    if (packageName === "FIRST") {
      const date = new Date(openedOn + "T12:00:00");
      const oldest = new Date(); oldest.setMonth(oldest.getMonth() - 6);
      if (!openedOn || !Number.isFinite(date.getTime()) || date > new Date() || date < oldest) issues.openedOn = "First is for businesses opened in the last six months. Choose an eligible opening date or select Site.";
    }
    setFieldErrors(issues);
    if (Object.keys(issues).length) { setError("Check the highlighted business information."); document.getElementById(`brief-${Object.keys(issues)[0]}`)?.focus(); return; }
    saving.current = true;
    setState("saving");
    setError("");
    try {
      const p = project || (await api<Project>("/api/projects", createNew ? { createNew: true, key: (creationKey.current ||= crypto.randomUUID()) } : {}));
      setProject(p);
      const brief = {
        description,
        goals,
        links,
        feel,
        openedOn,
        ...(reference
          ? includeReference
            ? { reference }
            : {}
          : project?.brief.reference
            ? { reference: project.brief.reference }
            : {}),
      };
      const serial = JSON.stringify({ name, brief, version: p.version });
      if (pending.current?.serial !== serial)
        pending.current = { serial, key: crypto.randomUUID() };
      const r = await api(`/api/projects/${p.id}/command`, {
        action: "save_business",
        payload: {
          name,
          brief,
          package: packageName,
          objects: initialObjects(brief),
        },
        expected: p.version,
        key: pending.current.key,
      });
      if (
        !r.project ||
        r.project.id !== p.id ||
        r.project.version !== p.version + 1
      )
        throw new Error(
          "Your business information has not been confirmed saved. Try again.",
        );
      pending.current = null;
      try {
        localStorage.removeItem(recoveryKey);
      } catch {}
      setProject(r.project);
      setState("saved");
      if (next) setStep(3);
      if (exit) window.location.assign("/app");
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    } finally {
      saving.current = false;
    }
  }
  async function checkout() {
    if (!project || busy) return;
    setError("");
    setBusy(true);
    try {
      const r = await api("/api/checkout", {
        projectId: project.id,
        kind: "initial",
      });
      window.location.assign(r.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const dirty = () => setState("dirty");
  return (
    <main className="start-page">
      <header className="start-topbar">
        <Link
          className="wordmark"
          href={
            process.env.NEXT_PUBLIC_MARKETING_URL ||
            "https://fourthform-marketing.vercel.app/"
          }
        >
          <span className="ff-mark" aria-hidden="true" />
          fourthform
        </Link>
        <span>From brief to live, in one place.</span>
        <Link href="/app">Your projects</Link>
      </header>
      <div className="start-shell">
        <aside className="start-progress">
          <span className="overline">Your website</span>
          <h1>{!signedIn && mode === "signin" ? "Your workspace." : "Start your site."}</h1>
          <p>A little context. A clear beginning.</p>
          <ol className="onboarding-steps">
            {["Account", "Business information", "Payment"].map((x, i) => (
              <li
                aria-current={step === i + 1 ? "step" : undefined}
                className={step === i + 1 ? "active" : ""}
                key={x}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {x}
              </li>
            ))}
          </ol>
          <div className="start-rule">
            <strong>
              {packageName === "FIRST"
                ? "Fourthform First costs A$199."
                : "A website costs A$1,500."}
            </strong>
            <p>
              {packageName === "FIRST"
                ? "One page. One revision round. Core included."
                : "A$200 to start. A$1,300 when approved."}
            </p>
            <p>
              {packageName === "FIRST"
                ? "For businesses opened within the last six months."
                : "Three revision rounds included. Each round is a batch of Directions."}
            </p>
          </div>
        </aside>
        <section className="start-card">
          <div className="start-panel">
            {recovery && (
              <section className="recovery-notice" role="status">
                <p>We found unfinished business information on this device.</p>
                <button
                  onClick={() => {
                    setName(recovery.name);
                    setDescription(recovery.description);
                    setLinks(recovery.links);
                    setGoals(recovery.goals);
                    setFeel(recovery.feel);
                    if (["SITE", "FIRST"].includes(recovery.packageName))
                      setPackageName(recovery.packageName);
                    if (typeof recovery.openedOn === "string")
                      setOpenedOn(recovery.openedOn);
                    if (typeof recovery.includeReference === "boolean")
                      setIncludeReference(recovery.includeReference);
                    setRecovery(null);
                    setState("dirty");
                  }}
                >
                  Restore draft
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem(recoveryKey);
                    } catch {}
                    setRecovery(null);
                  }}
                >
                  Keep saved version
                </button>
              </section>
            )}
            <PaymentReturn payment={payment} />
            {!configurationReady && (
              <p className="notice" role="status">
                Account access is temporarily paused. Please try again later.
              </p>
            )}
            {step === 1 ? (
              <>
                <div className="start-heading">
                  <span>01 / Account</span>
                  <h2>
                    {mode === "signup"
                      ? "Your website starts here."
                      : "Welcome back."}
                  </h2>
                </div>
                {authNotice && (
                  <p className="notice" role="status">{authNotice}</p>
                )}
                {googleReady && <button
                  className="google-button"
                  disabled={busy || !configurationReady}
                  onClick={() => void auth(true)}
                >
                  Continue with Google
                </button>}
                <Link href="/account/recover">Forgot password?</Link>
                {confirmationSent && <div className="connected-actions"><button disabled={busy} onClick={() => void auth(false, true)}>Resend confirmation</button><button disabled={busy} onClick={() => { setConfirmationSent(false); setAuthNotice(""); }}>Use another email</button></div>}
                <div className="split-label">
                  <i />
                  <span>or</span>
                  <i />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void auth();
                  }}
                >
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
                  <label>
                    Password
                    <input
                      type="password"
                      minLength={8}
                      required
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <button
                    className="primary wide"
                    disabled={busy || !configurationReady}
                  >
                    {busy
                      ? "Continuing…"
                      : mode === "signup"
                        ? "Create account"
                        : "Sign in"}
                  </button>
                </form>
                <button
                  className="text-button"
                  onClick={() =>
                    setMode(mode === "signup" ? "signin" : "signup")
                  }
                >
                  {mode === "signup"
                    ? "Already have an account? Sign in"
                    : "Create an account"}
                </button>
              </>
            ) : step === 2 ? (
              <fieldset disabled={state === "saving" || !!recovery}>
                <div className="start-heading">
                  <span>02 / Business information</span>
                  <h2>Tell us the useful parts.</h2>
                  <p>This becomes the beginning of your Initial Direction.</p>
                </div>
                <label>
                  Website package
                  <select
                    value={packageName}
                    onChange={(e) => {
                      setPackageName(e.target.value as "SITE" | "FIRST");
                      dirty();
                    }}
                  >
                    <option value="SITE">Site · A$1,500 · Up to 5 pages</option>
                    <option value="FIRST">First · A$199 · One page</option>
                  </select>
                </label>
                {packageName === "FIRST" && (
                  <label>
                    When did your business open?
                    <input
                      id="brief-openedOn"
                      aria-invalid={!!fieldErrors.openedOn}
                      aria-describedby="brief-openedOn-help"
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={openedOn}
                      onChange={(e) => {
                        setOpenedOn(e.target.value);
                        dirty();
                      }}
                    />
                    <small id="brief-openedOn-help">{fieldErrors.openedOn || "First is available within six months of opening."}</small>
                    <small>
                      First is available within six months of opening. The date
                      is checked before your brief is saved.
                    </small>
                  </label>
                )}
                {reference && (
                  <div className="connected-card">
                    <span className="overline">Selected design reference</span>
                    <h3>{reference.title}</h3>
                    <p>
                      This studio concept helps explain the direction you like.
                      We build your website around your business.
                    </p>
                    <a href={reference.url} target="_blank" rel="noreferrer">
                      View reference ↗
                    </a>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={includeReference}
                        onChange={(e) => {
                          setIncludeReference(e.target.checked);
                          dirty();
                        }}
                      />
                      Include this reference in my Initial Direction
                    </label>
                  </div>
                )}
                <label>
                  Business name
                  <input
                    id="brief-name"
                    required
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby="brief-name-error"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      dirty();
                    }}
                    maxLength={160}
                  />
                  {fieldErrors.name && <small id="brief-name-error">{fieldErrors.name}</small>}
                </label>
                <label>
                  What does your business do?
                  <textarea
                    id="brief-description"
                    required
                    maxLength={3000}
                    aria-invalid={!!fieldErrors.description}
                    aria-describedby="brief-description-help"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      dirty();
                    }}
                  />
                </label>
                <small id="brief-description-help">{fieldErrors.description || `${description.length} / 3,000 characters`}</small>
                <fieldset>
                  <legend>What should your website help people do?</legend>
                  <div className="chips">
                    {[
                      "Book",
                      "Buy",
                      "Visit",
                      "Contact us",
                      "Understand what we do",
                      "Something else",
                    ].map((g) => (
                      <button
                        aria-pressed={goals.includes(g)}
                        key={g}
                        onClick={() => {
                          setGoals((v) =>
                            v.includes(g)
                              ? v.filter((x) => x !== g)
                              : [...v, g],
                          );
                          dirty();
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  Anything already online?
                  <textarea
                    value={links}
                    onChange={(e) => {
                      setLinks(e.target.value);
                      dirty();
                    }}
                    placeholder="Website, social pages or references"
                  />
                </label>
                <details>
                  <summary>
                    Visual direction <span className="muted">Optional</span>
                  </summary>
                  <label>
                    How should it feel?
                    <input
                      value={feel}
                      placeholder="Quiet, warm, refined…"
                      onChange={(e) => {
                        setFeel(e.target.value);
                        dirty();
                      }}
                    />
                  </label>
                </details>
                <SaveControl
                  state={state}
                  onSave={() => void save()}
                  error={error}
                />
                <div className="start-actions">
                  <button
                    disabled={state === "saving" || !name.trim()}
                    onClick={() => void save(false, true)}
                  >
                    Save and exit
                  </button>
                  <button
                    className="primary"
                    disabled={state === "saving" || !name.trim()}
                    onClick={() => void save(true)}
                  >
                    Save & continue
                  </button>
                </div>
              </fieldset>
            ) : (
              <>
                <div className="start-heading">
                  <span>03 / Payment</span>
                  <h2>Bring it into form.</h2>
                </div>
                <div className="commit-card">
                  <div>
                    <span>{packageName === "FIRST" ? "First · one custom page" : "Site · up to 5 custom pages"}</span>
                    <strong>
                      {packageName === "FIRST" ? "A$199" : "A$1,500"}
                    </strong>
                  </div>
                  <div>
                    <span>Today</span>
                    <strong>
                      {packageName === "FIRST" ? "A$199" : "A$200"}
                    </strong>
                  </div>
                  <div>
                    <span>When you approve</span>
                    <strong>
                      {packageName === "FIRST" ? "A$0" : "A$1,300"}
                    </strong>
                  </div>
                </div>
                <p>
                  {packageName === "FIRST"
                    ? "One revision round included."
                    : "Three revision rounds included."}{" "}
                  Your Initial Direction does not use a revision.
                </p>
                <p className="muted">
                  Core is included after launch. Domain registration and
                  renewals are paid directly to your registrar.
                </p>
                <button
                  className="primary wide"
                  disabled={busy || payment.blocked}
                  onClick={() => void checkout()}
                >
                  {busy
                    ? "Opening secure checkout…"
                    : packageName === "FIRST"
                      ? "Pay A$199 and start"
                      : "Pay A$200 and start"}
                </button>
                <button className="text-button" onClick={() => setStep(2)}>
                  Edit business information
                </button>
              </>
            )}
            {error && step !== 2 && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
