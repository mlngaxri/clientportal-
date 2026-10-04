import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review preview context is scoped to the acknowledged board identity", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /const \[contextState, setContextState\] = useState<\{ identity: string; target: BoardObject\["target"\] \}>\(\);\s*const context = contextState\?\.identity === boardIdentity \? contextState\.target : undefined;/,
    "Draw a Direction must not reuse preview context captured for an obsolete Review identity",
  );
  assert.match(
    source,
    /onContext=\{next => setContextState\(previous => previous\?\.identity === boardIdentity && previous\.target\?\.page === next\?\.page && previous\.target\?\.width === next\?\.width && previous\.target\?\.scroll === next\?\.scroll \? previous : \{ identity: boardIdentity, target: next \}\)\}/,
    "preview context updates must be tagged with the acknowledged Review identity that produced them",
  );
  assert.match(
    source,
    /<button type="button" className="inspector-new-comment" disabled=\{!context\} onClick=\{\(\) => add\(\{ type: "drawing", strokes: \[\], target: context \}\)\}>Draw a Direction<\/button>/,
    "drawing creation must remain disabled until the current Review has supplied preview context",
  );
});
