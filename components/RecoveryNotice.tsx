"use client";
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
  return (
    <>
      {localWarning && <p role="status">{localWarning}</p>}
      {recovery && (
        <section
          className="recovery-notice"
          aria-label="Recover unfinished work"
        >
          <p>
            Unfinished work was found on this device. It has not been saved to
            Fourthform.
          </p>
          <button onClick={recover}>Restore draft</button>
          <button onClick={() => downloadDraft(recovery)}>Export draft</button>
          <button onClick={discardRecovery}>Discard local copy</button>
        </section>
      )}
      {conflict && (
        <section className="recovery-notice" role="alert">
          <p>
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
                onClick={() => resolveConflict("merge")}
                disabled={conflict.conflicts.length > 0}
              >
                Merge separate changes
              </button>
              <button onClick={() => resolveConflict("local")}>
                Continue with my draft
              </button>
            </>
          )}
          <button onClick={() => resolveConflict("remote")}>
            Use server version
          </button>
          <button
            onClick={() =>
              downloadDraft({ data, remote: conflict.remote.data })
            }
          >
            Export both versions
          </button>
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
