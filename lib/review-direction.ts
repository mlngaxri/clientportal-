import type { BoardObject } from "./model";

/**
 * A revision Direction must carry customer intent, not merely a target pin.
 * Uploaded assets and drawings are meaningful without prose; links require a
 * usable HTTP(S) URL. This is a UX guard. The transactional server remains the
 * authority for revision entitlement consumption.
 */
export function isDirectionComplete(direction: BoardObject) {
  if (direction.text.trim()) return true;
  if (direction.assetId) return true;
  if (direction.type === "drawing" && (direction.strokes?.length || 0) > 0)
    return true;
  if (
    direction.type === "link" &&
    /^https?:\/\//i.test(direction.url?.trim() || "")
  )
    return true;
  return false;
}

export function incompleteDirections(directions: BoardObject[]) {
  return directions.filter((direction) => !isDirectionComplete(direction));
}
