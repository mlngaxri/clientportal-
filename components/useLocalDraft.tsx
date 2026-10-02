"use client";
import { useEffect, useState } from "react";
type Draft<T> = { data: T; revision: string; updatedAt: string };
export function useLocalDraft<T>(key: string, data: T | null, dirty: boolean, revision: string) {
  const [recovery, setRecovery] = useState<Draft<T> | null>(null);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    setReady(false);
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved?.data && typeof saved.revision === "string" && typeof saved.updatedAt === "string") setRecovery(saved);
    } catch { setWarning("Device recovery is unavailable. Save before leaving."); }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready || recovery || !dirty || !data) return;
    try { localStorage.setItem(key, JSON.stringify({ data, revision, updatedAt: new Date().toISOString() })); }
    catch { setWarning("Device storage is full or unavailable. Keep this tab open until you save."); }
  }, [key, data, dirty, revision, ready, recovery]);
  function clear() {
    try { localStorage.removeItem(key); } catch { setWarning("The local recovery copy could not be cleared."); }
    setRecovery(null);
  }
  return { recovery, clear, warning };
}
export function DraftRecovery<T>({ draft, revision, onRestore }: { draft: ReturnType<typeof useLocalDraft<T>>; revision: string; onRestore: (data: T) => void }) {
  return <>{draft.warning && <p role="status">{draft.warning}</p>}{draft.recovery && <section className="recovery-notice" aria-label="Recover unfinished edits"><p>Edits from {new Date(draft.recovery.updatedAt).toLocaleString()} are available on this device.</p>{draft.recovery.revision !== revision && <p>The saved website changed since this draft. Review your recovered values before saving over the current version.</p>}<div className="connected-actions"><button onClick={() => { if (draft.recovery) { onRestore(draft.recovery.data); draft.clear(); } }}>Review recovered edits</button><button onClick={draft.clear}>Keep saved version</button></div></section>}</>;
}
