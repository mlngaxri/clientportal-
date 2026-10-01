"use client";
import { useEffect, useRef, useState } from "react";
import { uploadAsset, assetType } from "../lib/upload-client";
import { api } from "../lib/client";
import type { Board, BoardObject } from "../lib/model";
import { useSave, SaveControl } from "./useSave";
import AnnotationLayer from "./AnnotationLayer";
import Dialog from "./Dialog";
import RecoveryNotice from "./RecoveryNotice";
export default function DirectionBoard({
  board,
  readOnly = false,
  initial = false,
  onSent,
}: {
  board: Board;
  readOnly?: boolean;
  initial?: boolean;
  onSent?: () => void;
}) {
  const editor = useSave(board, readOnly);
  const { data, update, state, error, save, version, dirty } = editor;
  const [message, setMessage] = useState("");
  const [send, setSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [annotate, setAnnotate] = useState<string | null>(null);
  const [uploads, setUploads] = useState<
    { name: string; progress: number; error?: string; file: File }[]
  >([]);
  const sendKey = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const modify = (id: string, patch: Partial<BoardObject>) =>
    update((d) => ({
      ...d,
      objects: d.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  function add(
    type: BoardObject["type"],
    text = "",
    extra: Partial<BoardObject> = {},
  ) {
    update((d) => ({
      ...d,
      objects: [
        ...d.objects,
        { id: crypto.randomUUID(), type, text, ...extra },
      ],
    }));
  }
  async function upload(file: File) {
    setUploads((v) => [
      ...v.filter((x) => x.file !== file),
      { name: file.name, progress: 0, file },
    ]);
    try {
      const asset = await uploadAsset(board.project_id, file, (progress) =>
        setUploads((items) =>
          items.map((item) =>
            item.file === file ? { ...item, progress } : item,
          ),
        ),
      );
      add(assetType(asset.mime), "", {
        assetId: asset.id,
        name: asset.name,
        url: asset.url,
      });
      setUploads((items) => items.filter((item) => item.file !== file));
    } catch (e) {
      setUploads((items) =>
        items.map((item) =>
          item.file === file ? { ...item, error: (e as Error).message } : item,
        ),
      );
    }
  }

  useEffect(
    () => () => {
      const r = recorder.current;
      if (r) {
        r.onstop = null;
        if (r.state !== "inactive") r.stop();
        r.stream.getTracks().forEach((t) => t.stop());
      }
    },
    [],
  );
  async function record(screen = false) {
    try {
      const stream = screen
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          })
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        void upload(
          new File(
            chunks,
            screen ? "Screen recording.webm" : "Voice note.webm",
            { type: r.mimeType },
          ),
        );
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      stream.getTracks().forEach(
        (t) =>
          (t.onended = () => {
            if (r.state !== "inactive") r.stop();
          }),
      );
      r.start();
      setRecording(true);
    } catch {
      setMessage(
        "Recording could not start. Check browser permissions, or upload a recording.",
      );
    }
  }
  async function sendInitial() {
    setSending(true);
    try {
      const b = await save();
      if (!b) return;
      await api(`/api/projects/${board.project_id}/command`, {
        action: "send_initial",
        payload: { boardId: board.id },
        expected: b.version,
        key: (sendKey.current ||= crypto.randomUUID()),
      });
      sendKey.current = null;
      setSend(false);
      onSent?.();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <section
      className="direction-workspace"
      onDragOver={(e) => {
        if (!readOnly) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDrag(false);
        Array.from(e.dataTransfer.files).forEach((f) => void upload(f));
      }}
      onPaste={(e) => {
        if (readOnly || (e.target as HTMLElement).matches("textarea,input"))
          return;
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          files.forEach((f) => void upload(f));
          return;
        }
        const text = e.clipboardData.getData("text");
        if (text) {
          e.preventDefault();
          add(
            /^https?:\/\//.test(text) ? "link" : "text",
            text,
            /^https?:\/\//.test(text) ? { url: text } : {},
          );
        }
      }}
    >
      <header className="workspace-heading">
        <div>
          <span className="overline">
            Form / {initial ? "Direction" : board.kind}
          </span>
          <h1>
            {initial
              ? "Your Initial Direction"
              : board.kind === "notes"
                ? "Additional notes"
                : board.kind[0].toUpperCase() + board.kind.slice(1)}
          </h1>
          <p>
            {readOnly
              ? "The submitted Direction is preserved here."
              : initial
                ? "We’ve started it with what you told us."
                : "Your content, in one place."}
          </p>
        </div>
        {!readOnly && (
          <SaveControl state={state} error={error} onSave={() => void save()} />
        )}
      </header>
      <RecoveryNotice editor={editor} />
      {initial && !readOnly && (
        <p className="direction-prompt">
          Add anything else that helps us understand the website you want.
        </p>
      )}
      {board.submitted_at && !readOnly && (
        <p className="notice">
          {JSON.stringify(data) !== JSON.stringify(board.submitted_data)
            ? "Changes not sent. Save and Send to update Fourthform."
            : "Sent to Fourthform. You can keep updating this until building begins."}
        </p>
      )}
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <div className="direction-objects">
        {data.objects.map((o, i) => (
          <article key={o.id} className={`direction-object ${o.type}`}>
            {!readOnly && (
              <div className="object-actions">
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, o.id]
                          : s.filter((id) => id !== o.id),
                      )
                    }
                  />{" "}
                  Select
                </label>
                <span>{o.group || ""}</span>
                <button
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() =>
                    update((d) => {
                      const objects = [...d.objects];
                      [objects[i - 1], objects[i]] = [
                        objects[i],
                        objects[i - 1],
                      ];
                      return { ...d, objects };
                    })
                  }
                >
                  ↑
                </button>
                <button
                  aria-label="Delete object"
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      objects: d.objects.filter((x) => x.id !== o.id),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            )}
            {o.type === "image" && (
              <div className="annotated-image">
                <img src={o.url} alt={o.text || o.name || "Uploaded image"} />
                {(annotate === o.id || !!o.strokes?.length) && (
                  <AnnotationLayer
                    strokes={o.strokes || []}
                    onChange={(strokes) => modify(o.id, { strokes })}
                    readOnly={readOnly || annotate !== o.id}
                  />
                )}
              </div>
            )}
            {o.type === "video" && (
              <>
                <video
                  controls
                  src={o.url}
                  onTimeUpdate={(e) => {
                    e.currentTarget.dataset.time = String(
                      e.currentTarget.currentTime,
                    );
                  }}
                />
                {!readOnly && (
                  <button
                    onClick={(e) => {
                      const video =
                        e.currentTarget.parentElement?.querySelector("video");
                      const text = prompt("Note at this moment");
                      if (text)
                        modify(o.id, {
                          notes: [
                            ...(o.notes || []),
                            { time: video?.currentTime || 0, text },
                          ],
                        });
                    }}
                  >
                    Add timestamped note
                  </button>
                )}
                {o.notes?.map((n, j) => (
                  <p key={j}>
                    <button
                      className="mono"
                      aria-label={`Play video at ${Math.floor(n.time)} seconds`}
                      onClick={(e) => {
                        const v = e.currentTarget
                          .closest("article")
                          ?.querySelector("video");
                        if (v) v.currentTime = n.time;
                      }}
                    >
                      {Math.floor(n.time / 60)}:
                      {String(Math.floor(n.time % 60)).padStart(2, "0")}
                    </button>{" "}
                    {n.text}
                  </p>
                ))}
              </>
            )}
            {o.type === "audio" && <audio controls src={o.url} />}
            {o.type === "file" && (
              <div>
                {o.name?.toLowerCase().endsWith(".pdf") && (
                  <iframe
                    title={o.name}
                    src={o.url}
                    style={{ width: "100%", height: 420 }}
                  />
                )}
                <a href={o.url} target="_blank" rel="noreferrer">
                  {o.name} ↗
                </a>
              </div>
            )}
            {o.type === "link" && (
              <a
                href={/^https?:\/\//.test(o.url || "") ? o.url : undefined}
                target="_blank"
                rel="noreferrer"
              >
                {o.url} ↗
              </a>
            )}
            {o.type === "drawing" && (
              <AnnotationLayer
                strokes={o.strokes || []}
                onChange={(strokes) => modify(o.id, { strokes })}
                readOnly={readOnly}
              />
            )}
            <textarea
              aria-label={
                o.type === "text" ? "Direction text" : "Note or description"
              }
              readOnly={readOnly}
              value={o.text}
              placeholder={
                o.type === "text"
                  ? "Write your Direction…"
                  : "Add a note or description…"
              }
              onChange={(e) => modify(o.id, { text: e.target.value })}
            />
            {o.type === "image" && !readOnly && (
              <button
                onClick={() => setAnnotate(annotate === o.id ? null : o.id)}
              >
                {annotate === o.id ? "Finish annotation" : "Annotate"}
              </button>
            )}
          </article>
        ))}
      </div>
      {uploads.map((u, i) => (
        <div className="upload-progress" key={i}>
          {u.name}{" "}
          {u.error ? (
            <>
              <span role="alert">{u.error}</span>
              <button onClick={() => void upload(u.file)}>Try again</button>
              <button
                onClick={() =>
                  setUploads((items) => items.filter((item) => item !== u))
                }
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <progress
                aria-label={`Uploading ${u.name}`}
                max={100}
                value={u.progress}
              />
              <span>
                {u.progress >= 95 ? "Validating upload…" : `${u.progress}%`}
              </span>
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <>
          <div className="direction-tools">
            <button onClick={() => add("text")}>Write</button>
            <button onClick={() => add("drawing", "", { strokes: [] })}>
              Draw
            </button>
            <button onClick={() => fileInput.current?.click()}>Upload</button>
            <details>
              <summary>+</summary>
              <div className="add-menu">
                <button
                  onClick={() => {
                    const url = prompt("Website or reference URL");
                    if (url && /^https?:\/\//.test(url))
                      add("link", "", { url });
                    else if (url)
                      setMessage("Use a complete http or https URL.");
                  }}
                >
                  Link
                </button>
                <button
                  onClick={() =>
                    recording ? recorder.current?.stop() : void record()
                  }
                >
                  {recording ? "Stop recording" : "Record audio"}
                </button>
                <button disabled={recording} onClick={() => void record(true)}>
                  Record screen
                </button>
              </div>
            </details>
            {selected.length > 1 && (
              <button
                onClick={() => {
                  const group = prompt("Group name") || "Group";
                  update((d) => ({
                    ...d,
                    objects: d.objects.map((o) =>
                      selected.includes(o.id) ? { ...o, group } : o,
                    ),
                  }));
                  setSelected([]);
                }}
              >
                Group
              </button>
            )}
          </div>
          <input
            hidden
            ref={fileInput}
            type="file"
            multiple
            onChange={(e) => {
              Array.from(e.target.files || []).forEach((f) => void upload(f));
              e.target.value = "";
            }}
          />
          {initial && (
            <div className="send-footer">
              <p>Save preserves your work. Send shares it with Fourthform.</p>
              <button
                className="primary"
                disabled={uploads.length > 0 || sending}
                onClick={() => setSend(true)}
              >
                Send
              </button>
            </div>
          )}
        </>
      )}
      {drag && <div className="drop-overlay">Drop into Direction</div>}
      {send && (
        <Dialog title="Send to Fourthform?" onClose={() => setSend(false)}>
          <p>
            You can keep updating this until we begin building. This does not
            use a revision.
          </p>
          <button onClick={() => setSend(false)}>Keep editing</button>
          <button
            className="primary"
            disabled={sending}
            onClick={() => void sendInitial()}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </Dialog>
      )}
    </section>
  );
}
