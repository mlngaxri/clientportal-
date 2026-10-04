"use client";
import { useState } from "react";
import { defaultSite, manifestSchema, contentSchema } from "../lib/site/schema";
import { api } from "../lib/client";
import type { Project } from "../lib/model";
export default function SiteSetup({ project }: { project: Project }) {
  const [definition, setDefinition] = useState(() =>
      JSON.stringify(defaultSite(project), null, 2),
    ),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  return (
    <details className="connected-card">
      <summary>Agency website setup</summary>
      <p>
        Define the customer’s real pages, editable fields and visual direction.
        The starting content comes from their brief. Each field becomes a stable
        review target.
      </p>
      <label>
        Website definition
        <textarea
          rows={20}
          value={definition}
          disabled={busy}
          spellCheck={false}
          onChange={(e) => setDefinition(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const parsed = JSON.parse(definition);
            manifestSchema.parse(parsed.manifest);
            contentSchema.parse(parsed.content);
            const r = await api(`/api/projects/${project.id}/setup`, parsed);
            setStatus(`Website connected. Review it at ${r.previewUrl}`);
          } catch (e) {
            setStatus((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Connecting…" : "Connect website"}
      </button>
      {status && <p role="status">{status}</p>}
    </details>
  );
}
