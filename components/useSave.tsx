"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { verifySaveReceipt } from "../lib/save-integrity";
import { api, ApiError } from "../lib/client";
import type { Board, DocumentData } from "../lib/model";
import {
  mergeDocuments,
  parseRecovery,
  recoveryKey,
  type RecoveryRecord,
} from "../lib/recovery";
export function useSave(board: Board, readOnly = false, options: { autosave?: boolean; validate?: (data: DocumentData) => string[] } = {}) {
  const optionsRef = useRef(options); optionsRef.current = options;
  const [removed, setRemoved] = useState<{ object: DocumentData["objects"][number]; index: number }[]>([]);
  const [data, setData] = useState<DocumentData>(
    board.locked_at && board.submitted_data ? board.submitted_data : board.data,
  );
  const [state, setState] = useState<"saved" | "dirty" | "saving" | "error">(
    "saved",
  );
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<RecoveryRecord | null>(null);
  const [conflict, setConflict] = useState<{
    remote: Board;
    merged: DocumentData;
    conflicts: string[];
    locked: boolean;
  } | null>(null);
  const [localWarning, setLocalWarning] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const base = useRef(data);
  const blocked = useRef(false);
  const storageKey = recoveryKey(board.project_id, board.id);
  useEffect(() => {
    try {
      const r = parseRecovery(
        localStorage.getItem(storageKey),
        board.project_id,
        board.id,
      );
      if (r && JSON.stringify(r.data) !== JSON.stringify(data)) {
        setRecovery(r);
        blocked.current = true;
      }
    } catch {
      setLocalWarning(
        "Device recovery is unavailable. Save before leaving this page.",
      );
    }
    setLoaded(true);
    // A board editor is keyed by board ID by its parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const latest = useRef(data),
    saved = useRef(JSON.stringify(data)),
    version = useRef(board.version),
    flight = useRef<Promise<Board | null> | null>(null),
    pending = useRef<{ snapshot: string; key: string } | null>(null);
  latest.current = data;
  const dirty = JSON.stringify(data) !== saved.current;
  const update = (next: DocumentData | ((d: DocumentData) => DocumentData)) => {
    if (readOnly || blocked.current || recovery || conflict) return;
    setData((old) => (typeof next === "function" ? next(old) : next));
    setState("dirty");
    setError("");
  };
  const save = useCallback(
    async function persist(): Promise<Board | null> {
      if (readOnly || blocked.current) return null;
      if (flight.current) {
        const result = await flight.current;
        if (result && JSON.stringify(latest.current) !== saved.current)
          return persist();
        return result;
      }
      const snapshot = structuredClone(latest.current);
      const issues = optionsRef.current.validate?.(snapshot) || [];
      if (issues.length) { setError(issues.join(" ")); setState("dirty"); return null; }
      const serial = JSON.stringify(snapshot);
      if (!pending.current || pending.current.snapshot !== serial)
        pending.current = { snapshot: serial, key: crypto.randomUUID() };
      setState("saving");
      setError("");
      const work = (async () => {
        try {
          const r = await api<{ board: Board }>(
            `/api/projects/${board.project_id}/command`,
            {
              action: "save_board",
              payload: { boardId: board.id, data: snapshot },
              expected: version.current,
              key: pending.current!.key,
            },
          );
          verifySaveReceipt(
            r.board,
            board.project_id,
            board.id,
            version.current,
            snapshot,
          );
          pending.current = null;
          version.current = r.board.version;
          saved.current = JSON.stringify(snapshot);
          base.current = snapshot;
          setSavedAt(new Date().toISOString());
          try {
            if (JSON.stringify(latest.current) === saved.current)
              localStorage.removeItem(storageKey);
          } catch {}
          setState(
            JSON.stringify(latest.current) === saved.current
              ? "saved"
              : "dirty",
          );
          return r.board;
        } catch (e) {
          setState("error");
          setError(
            e instanceof ApiError && e.status === 401
              ? "Your session ended. Your draft is retained on this device. Sign in again to save."
              : (e as Error).message,
          );
          if (e instanceof ApiError && e.status === 409) {
            blocked.current = true;
            try {
              const result = await api<{ boards: Board[] }>(
                `/api/projects/${board.project_id}`,
              );
              const found = result.boards.find((b) => b.id === board.id);
              const remote =
                found?.locked_at && found.submitted_data
                  ? { ...found, data: found.submitted_data }
                  : found;
              if (remote) {
                const merged = mergeDocuments(
                  base.current,
                  latest.current,
                  remote.data,
                );
                setConflict({
                  remote,
                  merged: merged.data,
                  conflicts: merged.conflicts,
                  locked:
                    !!remote.locked_at ||
                    (remote.status !== "DRAFT" && board.kind === "revision"),
                });
              } else blocked.current = false;
            } catch {
              blocked.current = false;
            }
          }
          return null;
        } finally {
          flight.current = null;
        }
      })();
      flight.current = work;
      return work;
    },
    [board.id, board.project_id, board.kind, readOnly, storageKey],
  );
  useEffect(() => {
    if (
      options.autosave === false ||
      !loaded ||
      !dirty ||
      readOnly ||
      recovery ||
      conflict ||
      state === "error" ||
      state === "saving"
    )
      return;
    const t = setTimeout(() => void save(), 3000);
    return () => clearTimeout(t);
  }, [data, dirty, save, readOnly, state, loaded, recovery, conflict, options.autosave]);
  useUnsavedGuard(dirty);
  useEffect(() => {
    if (!loaded || recovery || readOnly || !dirty) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          schema: 1,
          projectId: board.project_id,
          boardId: board.id,
          version: version.current,
          base: base.current,
          data,
          updatedAt: new Date().toISOString(),
        } satisfies RecoveryRecord),
      );
    } catch {
      setLocalWarning(
        "Device recovery is unavailable or full. Save or export your draft before leaving.",
      );
    }
  }, [
    data,
    dirty,
    loaded,
    readOnly,
    recovery,
    storageKey,
    board.id,
    board.project_id,
  ]);
  function discardRecovery() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecovery(null);
    blocked.current = false;
  }
  function recover() {
    if (!recovery) return;
    const r = recovery;
    setData(r.data);
    latest.current = r.data;
    setState("dirty");
    setRecovery(null);
    if (r.version !== board.version || readOnly) {
      const remote =
        board.locked_at && board.submitted_data
          ? { ...board, data: board.submitted_data }
          : board;
      const merged = mergeDocuments(r.base, r.data, remote.data);
      setConflict({
        remote,
        merged: merged.data,
        conflicts: merged.conflicts,
        locked: readOnly,
      });
      blocked.current = true;
    } else {
      blocked.current = false;
    }
  }
  function resolveConflict(choice: "local" | "remote" | "merge") {
    if (!conflict || (choice !== "remote" && conflict.locked)) return;
    const remote = conflict.remote;
    const next =
      choice === "remote"
        ? remote.data
        : choice === "merge"
          ? conflict.merged
          : latest.current;
    base.current = remote.data;
    saved.current = JSON.stringify(remote.data);
    version.current = remote.version;
    pending.current = null;
    blocked.current = false;
    setConflict(null);
    latest.current = next;
    setData(next);
    setError("");
    setState(JSON.stringify(next) === saved.current ? "saved" : "dirty");
    if (choice === "remote") {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }
  function removeObjects(ids: string[]) {
    if (readOnly || blocked.current || recovery || conflict) return;
    setRemoved(latest.current.objects.flatMap((object, index) => ids.includes(object.id) ? [{ object, index }] : []));
    update(d => ({ ...d, objects: d.objects.filter(o => !ids.includes(o.id)) }));
  }
  function undoRemove() {
    update(d => {
      const objects = [...d.objects];
      removed.forEach(({ object, index }) => { if (!objects.some(o => o.id === object.id)) objects.splice(Math.min(index, objects.length), 0, object); });
      return { ...d, objects };
    });
    setRemoved([]);
  }
  return {
    removed, removeObjects, undoRemove,
    data,
    savedAt,
    update,
    state,
    error,
    dirty,
    save,
    version,
    recovery,
    conflict,
    recover,
    discardRecovery,
    resolveConflict,
    localWarning,
  };
}
export function SaveControl({
  state,
  error,
  onSave,
  label = "Save",
  disabled = false,
  savedAt,
}: {
  state: string;
  error?: string;
  onSave: () => void;
  label?: string;
  disabled?: boolean;
  savedAt?: string | null;
}) {
  const labels: Record<string, string> = {
    dirty: "Unsaved changes",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved",
  };
  return (
    <div className="save-control">
      <span role="status" aria-live="polite">
        {state === "saved" && savedAt
          ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : labels[state]}
      </span>
      <button
        className={state === "dirty" ? "accent" : ""}
        disabled={disabled || state === "saving"}
        onClick={onSave}
      >
        {state === "error" ? "Try again" : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
