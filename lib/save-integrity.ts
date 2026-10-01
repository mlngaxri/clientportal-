import type { Board, DocumentData } from "./model";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
/** Only an exact versioned server receipt can move the editor into Saved. */
export function verifySaveReceipt(
  board: Board | undefined,
  projectId: string,
  boardId: string,
  expected: number,
  snapshot: DocumentData,
): Board {
  if (
    !board ||
    board.id !== boardId ||
    board.project_id !== projectId ||
    board.version !== expected + 1 ||
    canonical(board.data) !== canonical(snapshot)
  )
    throw new Error(
      "The server did not confirm this draft. Your changes are retained; try again.",
    );
  return board;
}
