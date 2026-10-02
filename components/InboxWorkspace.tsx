"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/client";
type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  page_id: string;
  status: string;
  created_at: string;
};
export default function InboxWorkspace({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("new"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [pendingRows, setPendingRows] = useState<string[]>([]);
  async function load(before?: string) {
    setBusy(true);
    try {
      const r = await api(
        `/api/projects/${projectId}/forms${before ? `?before=${encodeURIComponent(before)}` : ""}`,
      );
      setMessages((m) => (before ? [...m, ...r.messages] : r.messages));
      setNext(r.next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [projectId]);
  async function status(id: string, value: string) {
    if (pendingRows.includes(id)) return;
    setPendingRows(rows => [...rows, id]);
    setError("");
    try {
      await api(`/api/projects/${projectId}/forms`, { id, status: value });
      setNotice(`Enquiry ${value === "new" ? "marked unread" : value === "read" ? "marked read" : "archived"}.`);
      setMessages((m) =>
        m.map((item) => (item.id === id ? { ...item, status: value } : item)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingRows(rows => rows.filter(row => row !== id));
    }
  }
  const visible = messages.filter(m => (filter === "all" || m.status === filter) && `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="direction-workspace connected-inbox">
      <header className="workspace-heading">
        <div>
          <span className="overline">Website / Inbox</span>
          <h1>Every enquiry, in one place.</h1>
          <p>
            Messages are saved to your account when the website confirms
            receipt. Email notifications are an additional delivery channel.
          </p>
        </div>
        <button disabled={busy} onClick={() => void load()}>
          Refresh inbox
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="chips" role="group" aria-label="Filter enquiries">{[["new", "Unread"], ["read", "Read"], ["archived", "Archived"], ["all", "All"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} ({messages.filter(m => value === "all" || m.status === value).length})</button>)}</div>
      <label>Search loaded enquiries<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email or message" /></label>
      {!visible.length && messages.length > 0 && <p role="status">No matching enquiries in the loaded messages. Change the filter or load older messages.</p>}
      {busy && !messages.length && <p role="status">Loading your enquiries…</p>}
      {!messages.length && !busy && !error && (
        <p className="connected-empty">
          No enquiries yet. Your published contact form sends messages here.
        </p>
      )}
      {visible.map((m) => (
        <article className={`connected-card ${m.status}`} key={m.id}>
          <span className="overline">
            {m.status} · {new Date(m.created_at).toLocaleString()}
          </span>
          <button className="inbox-item-title" aria-expanded={selected === m.id} onClick={() => setSelected(selected === m.id ? null : m.id)}><strong>{m.name}</strong><span>{m.message.slice(0, 90)}{m.message.length > 90 ? "…" : ""}</span></button>
          {selected === m.id && <>
          <a href={`mailto:${m.email}`}>{m.email}</a>
          <p>{m.message}</p>
          <div className="connected-actions">
            <button
              disabled={pendingRows.includes(m.id)}
              onClick={() =>
                void status(m.id, m.status === "read" ? "new" : "read")
              }
            >
              {m.status === "read" ? "Mark unread" : "Mark read"}
            </button>
            <button
              disabled={pendingRows.includes(m.id)}
              onClick={() =>
                void status(m.id, m.status === "archived" ? "new" : "archived")
              }
            >
              {m.status === "archived" ? "Restore" : "Archive"}
            </button>
          </div>
          </>}
        </article>
      ))}
      {next && (
        <button disabled={busy} onClick={() => void load(next)}>
          Load older messages
        </button>
      )}
    </section>
  );
}
