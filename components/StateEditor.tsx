"use client";
import { useState } from "react";
import type { Board } from "../lib/model";
import {
  evaluateStates,
  validateState,
  type ScheduledState,
} from "../lib/states";
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
  const editor = useSave(board, !pro);
  const [selected, setSelected] = useState<string | null>(null);
  const [at, setAt] = useState(() => new Date().toISOString().slice(0, 16));
  const states = (Array.isArray(editor.data.states) ? editor.data.states : []) as ScheduledState[];
  const state = states.find((s) => s.id === selected);
  const preview = evaluateStates(states, new Date(`${at}:00Z`), {
    heading: "Your usual website heading",
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
          enabled: true,
          timezone: "Australia/Brisbane",
          days: [1, 2, 3, 4, 5],
          start: "11:00",
          end: "15:00",
          priority: 0,
          overrides: { heading: "" },
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
            Draft and preview scheduled variations. Live scheduling is not
            connected.
          </p>
        </div>
        {pro && (
          <SaveControl
            state={editor.state}
            error={editor.error}
            onSave={() => void editor.save()}
            disabled={states.some((s) => validateState(s).length > 0)}
          />
        )}
      </header>
      <RecoveryNotice editor={editor} />
      {pro ? (
        <>
          <div className="chips">
            {states.map((s) => (
              <button
                key={s.id}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {s.title}
              </button>
            ))}
            <button onClick={add}>Add State</button>
          </div>
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
              <label>
                Timezone
                <input
                  value={state.timezone}
                  onChange={(e) => change({ timezone: e.target.value })}
                  placeholder="Australia/Brisbane"
                />
              </label>
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
              <label>
                Heading
                <input
                  value={state.overrides.heading || ""}
                  onChange={(e) =>
                    change({
                      overrides: {
                        ...state.overrides,
                        heading: e.target.value,
                      },
                    })
                  }
                />
              </label>
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
                Enabled in preview
              </label>
              {validateState(state).map((issue) => (
                <p role="alert" key={issue}>
                  {issue}
                </p>
              ))}
              <button
                onClick={() => {
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
            Preview instant (UTC)
            <input
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </label>
          <div className="state-live-demo">
            <span>State preview</span>
            <h2>{preview.content.heading}</h2>
            <p>
              {preview.activeIds.length} active schedule
              {preview.activeIds.length === 1 ? "" : "s"}
            </p>
            {preview.conflicts.length > 0 && (
              <p role="alert">
                Overlapping content: {preview.conflicts.join(", ")}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            Core includes your complete website. Pro adds scheduled States and
            deeper intelligence.
          </p>
          <button onClick={onUpgrade}>Pro · A$39/month</button>
        </>
      )}
    </section>
  );
}
