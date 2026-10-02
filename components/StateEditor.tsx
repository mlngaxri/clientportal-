"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/client";
import type { SiteManifest, SiteContent } from "../lib/site/service";
import type { Board } from "../lib/model";
import {
  evaluateStates,
  validateState,
  validateStates,
  type ScheduledState,
} from "../lib/states";
import Dialog from "./Dialog";
import TimezonePicker from "./TimezonePicker";
import RecoveryNotice from "./RecoveryNotice";
import { useSave, SaveControl } from "./useSave";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export default function StateEditor({
  board,
  pro,
  onUpgrade,
}: {
  board: Board;
  pro: boolean;
  onUpgrade: () => void;
}) {
  const editor = useSave(board, !pro, { autosave: false, validate: data => validateStates(data.states || []) });
  const [release, setRelease] = useState<{ states: ScheduledState[]; activated_at: string } | null>(null);
  const [timezone, setTimezone] = useState("Australia/Brisbane");
  const [activating, setActivating] = useState(false), [confirm, setConfirm] = useState(false);
  const [removed, setRemoved] = useState<ScheduledState | null>(null);
  const activateKey = useRef<{ expected: number; key: string } | null>(null);
  const [site, setSite] = useState<{
    manifest: SiteManifest;
    content: SiteContent;
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    void api(`/api/projects/${board.project_id}/states`).then(r => { if (active) setRelease(r.release); }).catch(e => { if (active) setLoadError(e.message); });
    void api(`/api/projects/${board.project_id}/settings`).then(r => { if (active) setTimezone(r.settings.timezone); }).catch(e => { if (active) setLoadError(e.message); });
    void api<{ manifest: SiteManifest; content: SiteContent }>(
      `/api/projects/${board.project_id}/site`,
    )
      .then((r) => {
        if (active) setSite(r);
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
    };
  }, [board.project_id]);
  const fields =
    site?.manifest.pages.flatMap((p) =>
      p.fields
        .filter((f) => f.kind === "text")
        .map((f) => ({ ...f, label: `${p.title}: ${f.label}` })),
    ) || [];
  const defaultField =
    fields.find((f) => f.role === "heading")?.id || fields[0]?.id;
  const [selected, setSelected] = useState<string | null>(null);
  const [at, setAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const states = (
    Array.isArray(editor.data.states) ? editor.data.states : []
  ) as ScheduledState[];
  const state = states.find((s) => s.id === selected);
  const preview = evaluateStates(states, new Date(at), {
    ...(site?.content.fields || {}),
  });
  function change(patch: Partial<ScheduledState>) {
    editor.update((d) => ({
      ...d,
      states: states.map((s) => (s.id === selected ? { ...s, ...patch } : s)),
    }));
  }
  function add() {
    const id = crypto.randomUUID();
    editor.update((d) => ({
      ...d,
      states: [
        ...states,
        {
          id,
          title: "New State",
          enabled: false,
          timezone,
          days: [1, 2, 3, 4, 5],
          start: "11:00",
          end: "15:00",
          priority: 0,
          overrides: defaultField
            ? { [defaultField]: site?.content.fields[defaultField] || "" }
            : {},
        } satisfies ScheduledState,
      ],
    }));
    setSelected(id);
  }
  return (
    <section className="direction-workspace">
      <header className="workspace-heading">
        <div>
          <span className="overline">Form / States · Pro</span>
          <h1>Content for the right moment.</h1>
          <p>
            Save a draft, preview it, then activate your schedules when ready. Only activated schedules change your public website. Usual content returns outside their hours.
          </p>
        </div>
        {pro && (
          <SaveControl
            state={editor.state}
            error={editor.error}
            label="Save State draft"
            onSave={() => void editor.save()}
            disabled={states.some((s) => validateState(s).length > 0)}
          />
        )}
      </header>
      <RecoveryNotice editor={editor} />
      {loadError && <p role="alert">{loadError}</p>}
      {pro && <div className="connected-card"><span className="overline">Public schedules</span><p>{release ? `Last activated ${new Date(release.activated_at).toLocaleString()}. ${release.states.filter(s => s.enabled).length} enabled schedules.` : "No schedules are active on your website yet."}</p><button className="primary" disabled={activating || validateStates(states).length > 0 || (!!release && JSON.stringify(states) === JSON.stringify(release.states))} onClick={() => setConfirm(true)}>Review and activate schedules</button><p>Draft edits, pauses and deletions take effect on your website only after activation.</p></div>}
      {removed && <p className="undo-notice" role="status">State removed from draft. <button onClick={() => { editor.update(d => ({ ...d, states: [...((d.states || []) as ScheduledState[]), removed] })); setRemoved(null); }}>Undo deletion</button></p>}
      {pro ? (
        <>
          <div className="chips">
            {states.map((s) => (
              <button
                key={s.id}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {s.title} · {s.enabled ? "Enabled in draft" : "Paused in draft"}
              </button>
            ))}
            <button onClick={add} disabled={!defaultField}>
              Add State
            </button>
          </div>
          {!states.length && <p className="connected-empty">Start with a service window, announcement or seasonal offer. Add a State to try it without changing the live site.</p>}
          {state && (
            <fieldset className="state-fields">
              <legend>Schedule</legend>
              <label>
                Name
                <input
                  value={state.title}
                  onChange={(e) => change({ title: e.target.value })}
                />
              </label>
              <TimezonePicker value={state.timezone} onChange={timezone => change({ timezone })} />
              <p>{state.days.map(day => days[day]).join(", ") || "No days selected"} · {state.start} to {state.end} · {state.timezone}</p>
              <div className="chips">
                {days.map((d, i) => (
                  <button
                    key={d}
                    aria-pressed={state.days.includes(i)}
                    onClick={() =>
                      change({
                        days: state.days.includes(i)
                          ? state.days.filter((v) => v !== i)
                          : [...state.days, i],
                      })
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
              <label>
                From
                <input
                  type="time"
                  value={state.start}
                  onChange={(e) => change({ start: e.target.value })}
                />
              </label>
              <label>
                Until
                <input
                  type="time"
                  value={state.end}
                  onChange={(e) => change({ end: e.target.value })}
                />
              </label>
              <p>
                End time is exclusive. An overnight service belongs to its
                starting day. Schedules follow local clock time, including
                daylight saving changes.
              </p>
              <h3>Scheduled content</h3>
              {Object.keys(state.overrides).map((id) => (
                <div key={id} className="connected-card">
                  <label>
                    Content field
                    <select
                      value={id}
                      onChange={(e) => {
                        const overrides = { ...state.overrides };
                        delete overrides[id];
                        overrides[e.target.value] = state.overrides[id];
                        change({ overrides });
                      }}
                    >
                      {fields
                        .filter(
                          (f) =>
                            f.id === id ||
                            !Object.hasOwn(state.overrides, f.id),
                        )
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Content during this schedule
                    <textarea
                      value={state.overrides[id]}
                      maxLength={
                        fields.find((f) => f.id === id)?.maxLength || 10000
                      }
                      onChange={(e) =>
                        change({
                          overrides: {
                            ...state.overrides,
                            [id]: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <button
                    onClick={() => {
                      const overrides = { ...state.overrides };
                      delete overrides[id];
                      change({ overrides });
                    }}
                  >
                    Remove content field
                  </button>
                </div>
              ))}
              <button
                disabled={
                  !fields.some((f) => !Object.hasOwn(state.overrides, f.id))
                }
                onClick={() => {
                  const f = fields.find(
                    (f) => !Object.hasOwn(state.overrides, f.id),
                  );
                  if (f)
                    change({
                      overrides: {
                        ...state.overrides,
                        [f.id]: site?.content.fields[f.id] || "",
                      },
                    });
                }}
              >
                Add content field
              </button>
              <details>
                <summary>When schedules overlap</summary>
                <label>
                  Priority
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={state.priority}
                    onChange={(e) =>
                      change({ priority: Number(e.target.value) })
                    }
                  />
                </label>
                <p>
                  Higher priority wins. Equal priorities with different content
                  retain the usual website content and flag a conflict.
                </p>
              </details>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  onChange={(e) => change({ enabled: e.target.checked })}
                />
                Enable this schedule
              </label>
              {validateState(state).map((issue) => (
                <p role="alert" key={issue}>
                  {issue}
                </p>
              ))}
              <button
                onClick={() => {
                  setRemoved(state);
                  editor.update((d) => ({
                    ...d,
                    states: states.filter((s) => s.id !== selected),
                  }));
                  setSelected(null);
                }}
              >
                Remove State
              </button>
            </fieldset>
          )}
          <label>
            Preview date and time (your device timezone)
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </label>
          <p>Preview in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Active schedules: {preview.activeIds.map(id => states.find(s => s.id === id)?.title).join(", ") || "None"}.</p>
          <div className="state-live-demo">
            <span>State preview</span>
            {fields
              .filter((f) => f.role !== "image-alt")
              .map((f) => (
                <div key={f.id}>
                  <span>{f.label}</span>
                  <p>{preview.content[f.id] || "No content"}</p>
                </div>
              ))}
            <p>
              {preview.activeIds.length} active schedule
              {preview.activeIds.length === 1 ? "" : "s"}
            </p>
            {preview.conflicts.length > 0 && (
              <p role="alert">
                Overlapping content: {preview.conflicts.map(id => fields.find(f => f.id === id)?.label || id).join(", ")}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            Core includes your complete website. Pro adds scheduled States and
            automatic content changes.
          </p>
          <button onClick={onUpgrade}>Pro · A$39/month</button>
        </>
      )}
      {confirm && <Dialog title="Activate these State schedules?" onClose={() => { if (!activating) setConfirm(false); }}><p>{states.filter(s => s.enabled).length} enabled schedules will replace the currently active set. Content changes appear during each schedule’s hours. Removing all schedules restores usual content.</p><ul>{states.map(s => <li key={s.id}>{s.title}: {s.enabled ? `${s.start} to ${s.end}, ${s.timezone}` : "Paused"}</li>)}</ul><div className="connected-actions"><button disabled={activating} onClick={() => setConfirm(false)}>Keep editing</button><button className="primary" disabled={activating} onClick={async () => { if (activating) return; setActivating(true); setLoadError(""); try { const saved = await editor.save(); if (!saved) return; if (activateKey.current?.expected !== saved.version) activateKey.current = { expected: saved.version, key: crypto.randomUUID() }; const r = await api(`/api/projects/${board.project_id}/states`, { boardId: board.id, expected: saved.version, key: activateKey.current.key }); setRelease(r.release); activateKey.current = null; setConfirm(false); } catch (e) { setLoadError((e as Error).message); } finally { setActivating(false); } }}>{activating ? "Activating…" : "Activate on website"}</button></div>{loadError && <p role="alert">{loadError}</p>}</Dialog>}
    </section>
  );
}
