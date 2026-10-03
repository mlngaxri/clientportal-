"use client";
import { useEffect, useRef, useState } from "react";
import AnnotationLayer from "./AnnotationLayer";
import type { Stroke, BoardObject } from "../lib/model";
export default function ReviewCanvas({
  url,
  onDirection,
  onReplace,
  directions = [],
  onSelect,
  readOnly = false,
  selectedId,
  onContext,
  onAnnotate,
}: {
  url: string;
  onContext?: (target: BoardObject["target"]) => void;
  onAnnotate?: (strokes: Stroke[]) => void;
  readOnly?: boolean;
  selectedId?: string | null;
  directions?: BoardObject[];
  onSelect?: (id: string) => void;
  onDirection: (o: Partial<BoardObject>) => void;
  onReplace: (file: File, target: BoardObject["target"]) => void;
}) {
  const [width, setWidth] = useState(1024),
    [enabled, setEnabled] = useState(true),
    [ready, setReady] = useState(false),
    [available, setAvailable] = useState(900);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const frame = useRef<HTMLIFrameElement>(null),
    container = useRef<HTMLDivElement>(null);
  const framePage = useRef("");
  const drawing = directions.find(o => o.id === selectedId && o.type === "drawing");
  const choseWidth = useRef(false);
  const origin = new URL(
    url,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  ).origin;
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(e => { const usable = Math.max(1, e[0].contentRect.width - (innerWidth <= 760 ? 16 : 48)); setAvailable(usable); if (!choseWidth.current) { setWidth(innerWidth <= 760 ? (innerWidth < 360 ? 320 : 390) : 1024); choseWidth.current = true; } });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  function syncBridge() {
    frame.current?.contentWindow?.postMessage(
      { type: "ff-mode", enabled: enabled && !readOnly && !drawing },
      origin,
    );
    frame.current?.contentWindow?.postMessage(
      {
        type: "ff-pins",
        pins: directions.map((o, i) => ({
          id: o.id,
          target: o.target,
          number: i + 1,
        })),
      },
      origin,
    );
  }
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.origin !== origin)
        return;
      const m = e.data;
      if (m?.type === "ff-state") setReady(true);
      if (m?.type === "ff-context" && typeof m.context?.page === "string" && m.context.width >= 320 && m.context.width <= 2560 && Number.isFinite(m.context.scroll)) { framePage.current = m.context.page; onContext?.(m.context); }
      if (
        m?.type === "ff-pin" &&
        typeof m.id === "string" &&
        directions.some((o) => o.id === m.id)
      )
        onSelect?.(m.id);
      if (m?.type === "ff-unresolved" && Array.isArray(m.ids))
        setUnresolved(
          m.ids
            .slice(0, 500)
            .filter(
              (id: unknown) =>
                typeof id === "string" && directions.some((o) => o.id === id),
            ),
        );
      if (m?.type === "ff-ready") {
        setReady(true);
        syncBridge();
      }
      if (
        readOnly ||
        !enabled ||
        !m?.context ||
        typeof m.context.page !== "string" ||
        typeof m.context.width !== "number"
      )
        return;
      if (
        !Number.isFinite(m.context.width) ||
        m.context.width < 1 ||
        m.context.page.length > 2000 ||
        !Number.isFinite(m.context.scroll) ||
        m.context.scroll < 0 ||
        (m.context.selector !== undefined &&
          (typeof m.context.selector !== "string" ||
            m.context.selector.length > 2000)) ||
        (m.context.rect !== undefined &&
          (!m.context.rect ||
            !["x", "y", "width", "height"].every((k) =>
              Number.isFinite(m.context.rect[k]),
            ) ||
            m.context.rect.width < 0 ||
            m.context.rect.height < 0))
      )
        return;
      if (m.type === "ff-target")
        onDirection({
          target: m.context,
          text: "",
          name: String(m.label).slice(0, 90),
        });
      if (m.type === "ff-replace" && m.file instanceof File)
        onReplace(m.file, m.context);
    };
    window.addEventListener("message", receive);
    syncBridge();
    return () => window.removeEventListener("message", receive);
  }, [origin, enabled, readOnly, onDirection, onReplace, directions, onSelect, onContext, drawing]);
  useEffect(() => {
    const target = directions.find((o) => o.id === selectedId)?.target;
    if (target && drawing) setWidth(target.width);
    if (target?.page.startsWith("/") && !target.page.startsWith("//") && framePage.current && framePage.current !== target.page && frame.current) { frame.current.src = new URL(target.page, origin).toString(); return; }
    if (ready && target)
      frame.current?.contentWindow?.postMessage(
        { type: "ff-focus", selector: target.selector, page: target.page, scroll: target.scroll },
        origin,
      );
  }, [selectedId, ready, origin]);
  const scale = Math.min(1, Math.max(0.1, available / width));
  return (
    <section className="portal-v2-workspace">
      <div className="portal-workspace-toolbar">
        <span>Website preview</span>
        <div className="viewport-presets">
          {[320, 390, 768, 1024, 1440].map((w) => (
            <button
              type="button"
              key={w}
              onClick={() => { choseWidth.current = true; setWidth(w); }}
              aria-pressed={width === w}
              className={width === w ? "active" : ""}
            >
              {w}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={readOnly}
          aria-pressed={enabled && !readOnly}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled && !readOnly ? "Review mode" : "Browse mode"}
        </button>
      </div>
      <div className="review-frame-space" ref={container}>
        {unresolved.length > 0 && (
          <p role="status">
            {unresolved.length} Direction target(s) moved or disappeared. Select a note and choose Reattach to website. Their
            notes remain in the list.
          </p>
        )}
        {!ready && (
          <p className="bridge-notice">
            General Directions are available. Element feedback requires the
            review bridge on this preview.
          </p>
        )}
        <div
          className="real-site-object"
          style={{ width: width * scale, height: 760 * scale }}
        >
          <iframe
            ref={frame}
            title="Your website"
            src={url}
            onLoad={() => {
              setReady(false);
              syncBridge();
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{
              width,
              height: 760,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: 0,
              pointerEvents: drawing ? "none" : undefined,
            }}
          />
          {drawing && <div className="review-drawing"><AnnotationLayer readOnly={readOnly} strokes={drawing.strokes || []} onChange={strokes => onAnnotate?.(strokes)} /></div>}
        </div>
      </div>
      <div className="review-width">
        <span className="mono">320</span>
        <input
          aria-label="Website viewport width"
          type="range"
          min="320"
          max="1440"
          value={width}
          onChange={(e) => setWidth(+e.target.value)}
        />
        <span className="mono">{width} px</span>
      </div>
    </section>
  );
}
