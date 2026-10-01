"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
import { useUnsavedGuard } from "./useUnsavedGuard";
type Settings = {
  revision: number;
  timezone: string;
  notify_forms: boolean;
  notify_project: boolean;
  connections: { booking?: string; social?: string };
};
export default function SettingsWorkspace({
  projectId,
  connections = false,
}: {
  projectId: string;
  connections?: boolean;
}) {
  const [settings, setSettings] = useState<Settings | null>(null),
    [email, setEmail] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useUnsavedGuard(dirty);
  async function load() {
    const r = await api(`/api/projects/${projectId}/settings`);
    setSettings(r.settings);
    setEmail(r.email);
    setDirty(false);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [projectId]);
  async function save() {
    if (!settings) return;
    setBusy(true);
    setError("");
    try {
      const r = connections
        ? await api(`/api/projects/${projectId}/connections`, {
            expected: settings.revision,
            booking: settings.connections.booking || "",
            social: settings.connections.social || "",
          })
        : await api(`/api/projects/${projectId}/settings`, {
            expected: settings.revision,
            timezone: settings.timezone,
            notifyForms: settings.notify_forms,
            notifyProject: settings.notify_project,
          });
      setSettings(r.settings);
      setDirty(false);
      setNotice("Saved to your account.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">
            {connections ? "Website / Connections" : "Account / Settings"}
          </span>
          <h1>
            {connections
              ? "Keep the next step connected."
              : "Make this workspace yours."}
          </h1>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!settings && !error && <p role="status">Loading your saved {connections ? "connections" : "settings"}…</p>}
      {settings && (
        <fieldset className="connected-card" disabled={busy}>
          {connections ? (
            <>
              {["booking", "social"].map((key) => (
                <label key={key}>
                  {key === "booking" ? "Booking page" : "Social profile"}
                  <input
                    type="url"
                    placeholder="https://"
                    value={
                      settings.connections[key as "booking" | "social"] || ""
                    }
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        connections: {
                          ...settings.connections,
                          [key]: e.target.value,
                        },
                      });
                      setDirty(true);
                      setNotice("");
                    }}
                  />
                  {settings.connections[key as "booking" | "social"] && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={settings.connections[key as "booking" | "social"]}
                    >
                      Open connection ↗
                    </a>
                  )}
                </label>
              ))}
              <p>
                Saved connections appear on your live website. Your contact form
                saves real enquiries to the Inbox. Analytics are collected by
                Fourthform.
              </p>
            </>
          ) : (
            <>
              <label>
                Business timezone
                <input
                  value={settings.timezone}
                  placeholder="Australia/Brisbane"
                  onChange={(e) => {
                    setSettings({ ...settings, timezone: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.notify_forms}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      notify_forms: e.target.checked,
                    });
                    setDirty(true);
                  }}
                />
                Email me about website enquiries
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.notify_project}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      notify_project: e.target.checked,
                    });
                    setDirty(true);
                  }}
                />
                Email me about project updates
              </label>
              <p>
                Notifications go to your account address: {email}. Email
                delivery depends on the agency’s configured sending service.
                Messages stay available in the Inbox.
              </p>
              <a href="/account/password">Change your password ↗</a>
            </>
          )}
          <div className="connected-actions">
            <button
              className="primary"
              disabled={!dirty || busy}
              onClick={() => void save()}
            >
              Save {connections ? "connections" : "settings"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Discard unsaved changes and reload?")
                )
                  void load().catch((e) => setError(e.message));
              }}
            >
              Reload saved settings
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
