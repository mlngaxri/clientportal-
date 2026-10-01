import type { DocumentData } from "./model";
export type RecoveryRecord = {
  schema: 1;
  boardId: string;
  projectId: string;
  version: number;
  base: DocumentData;
  data: DocumentData;
  updatedAt: string;
};
export const recoveryKey = (projectId: string, boardId: string) =>
  `fourthform:draft:${projectId}:${boardId}`;
export function parseRecovery(
  raw: string | null,
  projectId: string,
  boardId: string,
): RecoveryRecord | null {
  try {
    const r = JSON.parse(raw || "null");
    if (
      !r ||
      r.schema !== 1 ||
      r.projectId !== projectId ||
      r.boardId !== boardId ||
      !Number.isInteger(r.version) ||
      r.version < 0 ||
      !Array.isArray(r.data?.objects) ||
      !Array.isArray(r.base?.objects) ||
      !Number.isFinite(Date.parse(r.updatedAt))
    )
      return null;
    const age = Date.now() - Date.parse(r.updatedAt);
    if (age > 30 * 86400000 || age < -5 * 60000) return null;
    return r;
  } catch {
    return null;
  }
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** Three-way merge. Conflicting values always require an explicit customer choice. */
export function mergeDocuments(
  base: DocumentData,
  local: DocumentData,
  remote: DocumentData,
) {
  const conflicts: string[] = [];
  function choose(key: string, b: unknown, l: unknown, r: unknown): unknown {
    if (equal(l, r) || equal(b, r)) return l;
    if (equal(b, l)) return r;
    conflicts.push(key);
    return l;
  }
  const data: DocumentData = { objects: [] };
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ])) {
    if (key === "objects") continue;
    const value = choose(key, base[key], local[key], remote[key]);
    if (value !== undefined) data[key] = value;
  }
  const b = new Map(base.objects.map((o) => [o.id, o]));
  const l = new Map(local.objects.map((o) => [o.id, o]));
  const r = new Map(remote.objects.map((o) => [o.id, o]));
  const order = choose(
    "Direction order",
    base.objects.map((o) => o.id),
    local.objects.map((o) => o.id),
    remote.objects.map((o) => o.id),
  ) as string[];
  for (const id of new Set([...order, ...r.keys(), ...l.keys(), ...b.keys()])) {
    const value = choose(`Direction ${id}`, b.get(id), l.get(id), r.get(id));
    if (value !== undefined)
      data.objects.push(value as DocumentData["objects"][number]);
  }
  return { data, conflicts };
}
export function downloadDraft(data: unknown, name = "fourthform-draft.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
