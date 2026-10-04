import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review synchronously gates duplicate lifecycle commands until acknowledgement", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(source, /commandGate\s*=\s*useRef<\{ pending: boolean; completed: string \| null \}>\(\{ pending: false, completed: null \}\)/, "Review must keep a synchronous command gate outside React render state");
  assert.match(source, /if \(commandGate\.current\.pending \|\| uploading \|\| commandGate\.current\.completed === action\) throw new Error/, "submit and withdraw must reject same-tick duplicates and replay before acknowledgement");
  assert.match(source, /commandGate\.current\.pending = true; setBusy\(true\); try \{[\s\S]*?commandGate\.current\.completed = action;[\s\S]*?\} finally \{ commandGate\.current\.pending = false; setBusy\(false\); \}/, "pending command protection must be acquired synchronously, retained through success, and released on every completion path");
  assert.match(source, /useEffect\(\(\) => \{\s*commandGate\.current\.completed = null;\s*setCompletedCommand\(null\);[\s\S]*?\}, \[board\.id, board\.status, board\.version\]\)/, "confirmed-command replay protection must reset when acknowledged board identity, status, or version changes even when the same acknowledgement also resets board-scoped upload state");
});
