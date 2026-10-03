import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review lifecycle completion cannot mutate a newer acknowledged board", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /const boardIdentity = `\$\{board\.id\}:\$\{board\.status\}:\$\{board\.version\}`;/, "Review must derive an acknowledged board identity");
  assert.match(source, /const startedFor = boardIdentity;[\s\S]*?await api\([\s\S]*?delete keys\.current\[action\]; if \(boardIdentityRef\.current !== startedFor\) return; setMessage\(""\); commandGate\.current\.completed = action;/, "stale command completion must stop before clearing messages, completing the new board gate, announcing, closing dialogs, or refreshing");
});

test("Review submission dialog belongs to the acknowledged board that opened it", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /\[submit, setSubmit\] = useState<string \| null>\(null\)/, "submission dialog state must retain its originating board identity");
  assert.match(source, /if \(!submit \|\| submit === boardIdentity\) return;\s*setSubmit\(null\);\s*setAnnouncement\("Submission dialog closed because this Review changed\."\);/, "an acknowledged identity change must invalidate the old submission dialog even when the next board remains editable");
  assert.match(source, /disabled=\{busy \|\| uploading > 0[\s\S]*?onClick=\{\(\) => setSubmit\(boardIdentity\)\}/, "the submit trigger must remain gated while a lifecycle command is pending and capture the current board identity when opened");
  assert.match(source, /\{submit === boardIdentity && <RevisionSubmitDialog[\s\S]*?onClose=\{\(\) => setSubmit\(null\)\}/, "only the dialog belonging to the current acknowledged board may render");
});
