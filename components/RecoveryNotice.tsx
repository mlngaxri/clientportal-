"use client";
import { useEffect, useRef } from "react";
import { downloadDraft } from "../lib/recovery";
import type { useSave } from "./useSave";
export default function RecoveryNotice({
  editor,
}: {
  editor: ReturnType<typeof useSave>;
}) {
  const {
    recovery,
    conflict,
    recover,
    discardRecovery,
    resolveConflict,
    data,
    localWarning,
  } = editor;
  const recoveryAction = useRef<HTMLButtonElement>(null);
  const conflictHeading = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (recovery) recoveryAction.current?.focus();
  }, [recovery]);

  useEffect(() => {
    if (conflict) conflictHeading.current?.focus();
  }, [conflict]);

  return (
    <>
      {editor.error.includes("session ended") && <p><a href={`/start?mode=signin&next=${encodeURIComponent(typeof window === "undefined" ? "/app" : location.pathname + location.search)}`}>Sign in and return to this draft ↗</a></p>}
      {editor.removed.length > 0 && <div className="undo-notice" role="status">{editor.removed.length} Direction{editor.removed.length === 1 ? "" : "s"} removed. <button type="button" onClick={editor.undoRemove}>Undo deletion</button></div>}
      {localWarning && <p role="status">{localWarning}</p>}
      {recovery && (
        <section
          className="recovery-notice"
          aria-labelledby="recovery-heading"
        >
          <p id="recovery-heading">
            Unfinished work was found on this device. It has not been saved to
            Fourthform.
          </p>
          <small>Local draft: {new Date(recovery.updatedAt).toLocaleString()} · Saved version {recovery.version}</small>
          <button type="button" ref={recoveryAction} onClick={recover}>Restore draft</button>
          <button type="button" onClick={() => downloadDraft(recovery)}>Export draft</button>
          <button type="button" onClick={discardRecovery}>Discard local copy</button>
        </section>
      )}
      {conflict && (
        <section className="recovery-notice" aria-labelledby="conflict-heading">
          <p id="conflict-heading" role="alert" ref={conflictHeading} tabIndex={-1}>
            This document changed elsewhere. Your draft is preserved. Choose
            which version to continue editing, then Save.
          </p>
          {conflict.locked && (
            <p>
              The brief is now locked. Export your draft to preserve new ideas.
            </p>
          )}
          {!conflict.locked && (
            <>
              <button
                type="button"
                onClick={() => resolveConflict("merge")}
                disabled={conflict.conflicts.length > 0}
              >
                Merge separate changes
              </button>
              <button type="button" onClick={() => resolveConflict("local")}>
                Continue with my draft
              </button>
            </>
          )}
          <button type="button" onClick={() => resolveConflict("remote")}>
            Use server version
          </button>
          <button
            type="button"
            onClick={() =>
              downloadDraft({ data, remote: conflict.remote.data })
            }
          >
            Export both versions
          </button>
          <div className="connected-grid">{[["Your draft", data], ["Saved version", conflict.remote.data]].map(([title, doc]) => <details key={String(title)} className="connected-card" open><summary>{String(title)}{title === "Saved version" ? ` · Version ${conflict.remote.version}` : ""}</summary><ol>{(doc as typeof data).objects.map(o => <li key={o.id}>{o.name || o.text.slice(0, 160) || o.type}</li>)}</ol></details>)}</div>
          {conflict.conflicts.length > 0 && (
            <p>
              {conflict.conflicts.length} overlapping changes need a version
              choice.
            </p>
          )}
        </section>
      )}
    </>
  );
}
