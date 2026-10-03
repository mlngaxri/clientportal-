import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review lifecycle completion cannot mutate a newer acknowledged board", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /const boardIdentity = `\$\{board\.id\}:\$\{board\.status\}:\$\{board\.version\}`;/, "Review must derive an acknowledged board identity");
  assert.match(source, /const startedFor = boardIdentity;[\s\S]*?await api\([\s\S]*?delete keys\.current\[action\]; if \(boardIdentityRef\.current !== startedFor\) return; setMessage\(""\); commandGate\.current\.completed = action;/, "stale command completion must stop before clearing messages, completing the new board gate, announcing, closing dialogs, or refreshing");
});
