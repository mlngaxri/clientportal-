"use client";
import { useEffect, useRef, useState } from "react";
import Dialog from "./Dialog";
import type { BoardObject } from "../lib/model";
export default function RevisionSubmitDialog({
  objects,
  number,
  limit,
  onClose,
  onSubmit,
}: {
  objects: BoardObject[];
  number: number;
  limit: number;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [stage, setStage] = useState(1),
    [ack, setAck] = useState(false),
    [holding, setHolding] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function hold() {
    if (timer.current || busy || !ack) return;
    setHolding(true);
    timer.current = setTimeout(async () => {
      timer.current = null;
      setHolding(false);
      setBusy(true);
      try {
        await onSubmit();
        onClose();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 900);
  }
  return (
    <Dialog
      title={
        stage === 1
          ? "Check the batch."
          : stage === 2
            ? `Use Revision ${String(number).padStart(2, "0")} of ${String(limit).padStart(2, "0")}?`
            : "Hold to submit."
      }
      onClose={() => {
        if (!busy) {
          stop();
          onClose();
        }
      }}
    >
      <span className="overline">{stage} / 3</span>
      {stage === 1 ? (
        <>
          <p>All of these Directions will be sent together.</p>
          <ol className="batch-list">
            {objects.map((o) => (
              <li key={o.id}>{o.text || o.name || o.type}</li>
            ))}
          </ol>
          <button className="primary" onClick={() => setStage(2)}>
            Everything is included
          </button>
        </>
      ) : stage === 2 ? (
        <>
          <p>
            Submitting this batch uses one included revision round. Saving
            drafts does not.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand this uses Revision {number} of {limit}.
          </label>
          <button onClick={() => setStage(1)}>Back to batch</button>
          <button
            className="primary"
            disabled={!ack}
            onClick={() => setStage(3)}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <p>You can withdraw until Fourthform starts work.</p>
          <button
            className={`hold-button ${holding ? "holding" : ""}`}
            disabled={busy}
            onPointerDown={hold}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onBlur={stop}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                hold();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") stop();
            }}
          >
            <span />
            {busy ? "Submitting…" : "Hold to submit"}
          </button>
          <small>
            Hold for 0.9 seconds. Release early to cancel. Keyboard: hold Space
            or Enter.
          </small>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </Dialog>
  );
}
