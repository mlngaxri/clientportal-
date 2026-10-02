"use client";
import { useId, useRef, useState } from "react";
import TextEntryDialog from "./TextEntryDialog";
import type { Stroke, Point } from "../lib/model";
export default function AnnotationLayer({
  strokes,
  onChange,
  readOnly = false,
}: {
  strokes: Stroke[];
  onChange: (s: Stroke[]) => void;
  readOnly?: boolean;
}) {
  const markerId = useId().replace(/:/g, "");
  const [tool, setTool] = useState<Stroke["type"]>("pen");
  const active = useRef<Stroke | null>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [textPoint, setTextPoint] = useState<Stroke | null>(null);
  function point(e: React.PointerEvent<SVGSVGElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(1000, ((e.clientX - r.left) / Math.max(1, r.width)) * 1000),
      ),
      y: Math.max(
        0,
        Math.min(600, ((e.clientY - r.top) / Math.max(1, r.height)) * 600),
      ),
    };
  }
  function down(e: React.PointerEvent<SVGSVGElement>) {
    if (readOnly || e.button !== 0 || active.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    active.current = { id: crypto.randomUUID(), type: tool, points: [p, p] };
    if (tool === "text") {
      setTextPoint(active.current);
      e.currentTarget.releasePointerCapture(e.pointerId);
      active.current = null;
      return;
    }
    setDraft(active.current);
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!active.current) return;
    const p = point(e);
    active.current = {
      ...active.current,
      points:
        tool === "pen"
          ? [...active.current.points, p]
          : [active.current.points[0], p],
    };
    setDraft(active.current);
  }
  function up() {
    if (active.current) onChange([...strokes, active.current]);
    active.current = null;
    setDraft(null);
  }
  function keyboardPlace(e: React.KeyboardEvent<SVGSVGElement>) {
    if (readOnly || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const center = { x: 500, y: 300 };
    if (tool === "text") {
      setTextPoint({ id: crypto.randomUUID(), type: tool, points: [center, center] });
      return;
    }
    const points: Point[] =
      tool === "rect"
        ? [{ x: 400, y: 250 }, { x: 600, y: 350 }]
        : tool === "arrow"
          ? [{ x: 400, y: 300 }, { x: 600, y: 300 }]
          : [{ x: 480, y: 300 }, { x: 520, y: 300 }];
    onChange([...strokes, { id: crypto.randomUUID(), type: tool, points }]);
  }
  return (
    <div className="annotation-editor">
      {textPoint && <TextEntryDialog title="Add an annotation" label="Annotation text" onClose={() => setTextPoint(null)} onSubmit={text => { onChange([...strokes, { ...textPoint, text }]); setTextPoint(null); }} />}
      {!readOnly && (
        <div className="annotation-tools">
          {(["pen", "arrow", "rect", "text"] as const).map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={tool === t}
              onClick={() => setTool(t)}
            >
              {t === "rect" ? "Rectangle" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(strokes.slice(0, -1))}
            disabled={!strokes.length}
          >
            Undo
          </button>
        </div>
      )}
      <svg
        role={readOnly ? "img" : "region"}
        aria-label={readOnly ? "Drawing" : "Annotation canvas. Choose a tool, then press Enter or Space to place an annotation in the center; pointer drawing is also available."}
        tabIndex={readOnly ? undefined : 0}
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        onKeyDown={keyboardPlace}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          active.current = null;
          setDraft(null);
        }}
        style={{ touchAction: readOnly ? "auto" : "none" }}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="var(--accent)" />
          </marker>
        </defs>
        {[...strokes, ...(draft ? [draft] : [])].map((s) => {
          const a = s.points[0],
            b = s.points[s.points.length - 1];
          if (!a || !b) return null;
          if (s.type === "text")
            return (
              <text
                key={s.id}
                x={a.x}
                y={a.y}
                fill="var(--accent)"
                fontSize="24"
              >
                {s.text}
              </text>
            );
          if (s.type === "rect")
            return (
              <rect
                key={s.id}
                x={Math.min(a.x, b.x)}
                y={Math.min(a.y, b.y)}
                width={Math.abs(b.x - a.x)}
                height={Math.abs(b.y - a.y)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              />
            );
          return (
            <polyline
              key={s.id}
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={s.type === "arrow" ? `url(#${markerId})` : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}
