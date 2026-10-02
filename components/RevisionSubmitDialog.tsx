"use client";
import { useState } from "react";
import type { BoardObject } from "../lib/model";
import Dialog from "./Dialog";
export default function RevisionSubmitDialog({ objects, number, limit, onClose, onSubmit }: { objects: BoardObject[]; number: number; limit: number; onClose: () => void; onSubmit: () => Promise<void> }) {
  const [ack, setAck] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <Dialog title={`Submit revision ${number} of ${limit}?`} onClose={() => { if (!busy) onClose(); }}>
    <p>These {objects.length} Directions will be sent together and use one revision round. {Math.max(0, limit - number)} round{limit - number === 1 ? "" : "s"} will remain.</p>
    <ol className="batch-list">{objects.map(o => <li key={o.id}><strong>{o.target?.page || "General"}</strong><p>{o.text || o.name || o.type}</p></li>)}</ol>
    <p>You can withdraw this batch until Fourthform starts work. Saving drafts uses no round.</p>
    <label className="check-label"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} disabled={busy} />I have included everything for this revision round.</label>
    <div className="connected-actions"><button type="button" disabled={busy} onClick={onClose}>Keep editing</button><button type="button" className="primary" disabled={!ack || busy} onClick={async () => { if (busy) return; setBusy(true); setError(""); try { await onSubmit(); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>{busy ? "Submitting…" : "Submit revision"}</button></div>
    {busy && <p role="status" aria-live="polite">Submitting revision…</p>}
    {error && <p role="alert">{error}</p>}
  </Dialog>;
}
