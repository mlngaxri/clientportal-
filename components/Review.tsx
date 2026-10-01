"use client";
import { useRef, useState } from "react";
import { uploadAsset, assetType } from "../lib/upload-client";
import { api } from "../lib/client";
import type { Board, BoardObject, Project } from "../lib/model";
import { useSave, SaveControl } from "./useSave";
import RecoveryNotice from "./RecoveryNotice";
import ReviewCanvas from "./ReviewCanvas";
import RevisionSubmitDialog from "./RevisionSubmitDialog";
import AnnotationLayer from "./AnnotationLayer";
export default function Review({
  project,
  board,
  otherBoards,
  onRefresh,
}: {
  project: Project;
  board: Board;
  otherBoards: Board[];
  onRefresh: () => void;
}) {
  const locked = board.status !== "DRAFT";
  const editor = useSave(board, locked);
  const { data, update, state, error, save, version } = editor;
  const [selected, setSelected] = useState<string | null>(null),
    [submit, setSubmit] = useState(false),
    [message, setMessage] = useState("");
  const keys = useRef<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const obj = data.objects.find((o) => o.id === selected);
  function add(patch: Partial<BoardObject> = {}) {
    if (locked) return;
    const id = crypto.randomUUID();
    update((d) => ({
      ...d,
      objects: [...d.objects, { id, type: "text", text: "", ...patch }],
    }));
    setSelected(id);
  }
  async function replacement(file: File, target: BoardObject["target"]) {
    if (locked) return;
    setUploading((n) => n + 1);
    try {
      const asset = await uploadAsset(project.id, file);
      add({ type: assetType(asset.mime), text: target ? "Replace this image" : "", name: asset.name, url: asset.url, assetId: asset.id, target });
    } catch (e) {
      setMessage(`${(e as Error).message} Your existing Directions are preserved; choose the file again to retry.`);
    } finally { setUploading((n) => n - 1); }
  }

  async function command(action: string) {
    if (busy || uploading) throw new Error("Wait for current uploads or submission to finish.");
    setBusy(true);
    try {
    const b = locked ? board : await save();
    if (!b) throw new Error("Save your Directions before submitting.");
    await api(`/api/projects/${project.id}/command`, {
      action,
      payload: { boardId: board.id },
      expected: b.version,
      key: keys.current[action] ||= crypto.randomUUID(),
    });
    delete keys.current[action];
    onRefresh();
    } finally { setBusy(false); }
  }
  return (
    <>
      {project.preview_url ? (
        <ReviewCanvas
          url={project.preview_url}
          readOnly={locked}
          selectedId={selected}
          directions={data.objects}
          onSelect={setSelected}
          onDirection={add}
          onReplace={replacement}
        />
      ) : (
        <div className="empty-workspace">
          The website preview has not been delivered yet.
        </div>
      )}
      <aside className="portal-v2-inspector">
        <div className="inspector-head">
          <div>
            <span className="overline">Review</span>
            <h2>{locked ? "Submitted Directions" : "Draft Directions"}</h2>
          </div>
          {!locked && (
            <button aria-label="Add Direction" onClick={() => add()}>
              +
            </button>
          )}
        </div>
        <RecoveryNotice editor={editor} />
        <div className="inspector-comments">
          {data.objects.map((o, i) => (
            <button
              className={`inspector-comment ${selected === o.id ? "active" : ""}`}
              key={o.id}
              onClick={() => setSelected(o.id)}
            >
              <span className="inspector-number">{i + 1}</span>
              <div>
                <span>
                  {o.target?.page || "General"} ·{" "}
                  {board.status === "DRAFT"
                    ? "Draft"
                    : board.status === "SUBMITTED"
                      ? "Submitted"
                      : board.status === "IN_PROGRESS"
                        ? "In progress"
                        : "Done"}
                </span>
                <p>{o.text || o.name || "New Direction"}</p>
              </div>
            </button>
          ))}
          {!data.objects.length && (
            <p className="muted">
              Click an element on your site, or add a general Direction.
            </p>
          )}
          {!locked && (
            <>
              <button className="inspector-new-comment" onClick={() => add()}>
                + General Direction
              </button>
              <button
                className="inspector-new-comment"
                onClick={() =>
                  add({
                    type: "drawing",
                    strokes: [],
                    target: { page: "/", width: 1024, scroll: 0 },
                  })
                }
              >
                Draw a Direction
              </button>
              <label className="upload-label">
                Attach a file
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void replacement(f, undefined);
                  }}
                />
              </label>
            </>
          )}
        </div>
        {obj && (
          <div className="selected-comment-editor">
            <span>{obj.name || obj.target?.selector || "Direction"}</span>
            {obj.type === "image" && (
              <img
                className="replacement-preview"
                src={obj.url}
                alt={obj.name || "Replacement"}
              />
            )}
            <textarea
              aria-label="Direction text"
              value={obj.text}
              readOnly={locked}
              placeholder="What would you like to change?"
              onChange={(e) =>
                update((d) => ({
                  ...d,
                  objects: d.objects.map((o) =>
                    o.id === obj.id ? { ...o, text: e.target.value } : o,
                  ),
                }))
              }
            />
            {obj.type === "video" && <video controls src={obj.url} />}
            {obj.type === "audio" && <audio controls src={obj.url} />}
            {obj.type === "file" && <a href={obj.url} target="_blank" rel="noreferrer">Open {obj.name}</a>}
            {obj.type === "drawing" && (
              <AnnotationLayer
                readOnly={locked}
                strokes={obj.strokes || []}
                onChange={(strokes) =>
                  update((d) => ({
                    ...d,
                    objects: d.objects.map((o) =>
                      o.id === obj.id ? { ...o, strokes } : o,
                    ),
                  }))
                }
              />
            )}{" "}
            {!locked && (
              <div className="row">
                <button onClick={() => void save()}>Save Direction</button>
                <button
                  onClick={() => {
                    update((d) => ({
                      ...d,
                      objects: d.objects.filter((o) => o.id !== obj.id),
                    }));
                    setSelected(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
        {otherBoards
          .filter((b) => b.status !== "DRAFT")
          .map((b) => (
            <details className="history-item" key={b.id}>
              <summary>
                {b.status === "IN_PROGRESS"
                  ? "Revision in progress"
                  : b.status === "DONE"
                    ? "Completed Revision"
                    : "Submitted Revision"}{" "}
                · {b.data.objects.length} Directions
              </summary>
              {(b.submitted_data || b.data).objects.map((o) => (
                <p key={o.id}>{o.text || o.name || o.type}</p>
              ))}
            </details>
          ))}
        <div className="portal-submit-panel">
          <span className="mono">
            Revision{" "}
            {String(
              locked ? project.revision_used : project.revision_used + 1,
            ).padStart(2, "0")}{" "}
            / {String(project.revision_limit).padStart(2, "0")}
          </span>
          {!locked && (
            <SaveControl
              state={state}
              error={error}
              onSave={() => void save()}
              label="Save revision"
            />
          )}
          {uploading > 0 && <p role="status">Uploading {uploading} file(s)…</p>}
          {message && <p role="alert">{message}</p>}
          {locked && board.status === "SUBMITTED" ? (
            <>
              <p>
                Waiting for Fourthform. You can withdraw before work begins.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  command("withdraw_revision").catch((e) =>
                    setMessage(e.message),
                  )
                }
              >
                Withdraw Revision
              </button>
            </>
          ) : !locked ? (
            <>
              <p>Saving preserves this batch. Only submitting uses a round.</p>
              <button
                disabled={
                  busy || uploading > 0 ||
                  !data.objects.length ||
                  project.phase === "REVISION_IN_PROGRESS" ||
                  project.revision_used >= project.revision_limit
                }
                onClick={() => setSubmit(true)}
              >
                Submit Revision
              </button>
              {project.phase === "REVISION_IN_PROGRESS" && (
                <p>Your next batch can be drafted and saved while we work.</p>
              )}
            </>
          ) : null}
        </div>
      </aside>
      {submit && (
        <RevisionSubmitDialog
          objects={data.objects}
          number={project.revision_used + 1}
          limit={project.revision_limit}
          onClose={() => setSubmit(false)}
          onSubmit={() => command("submit_revision")}
        />
      )}
    </>
  );
}
