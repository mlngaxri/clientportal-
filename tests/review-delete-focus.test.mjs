import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review Direction buttons contain only phrasing content and expose selection", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /className={`inspector-comment(?:(?!<\/button>)[\s\S])*?<span className="inspector-number">(?:(?!<\/button>)[\s\S])*?<span className="inspector-comment-copy">(?:(?!<\/button>)[\s\S])*?<span className="inspector-comment-text">/, "Direction rows must use phrasing elements inside their button rather than invalid flow-content wrappers");
  assert.doesNotMatch(source, /className={`inspector-comment(?:(?!<\/button>)[\s\S])*?<div>/, "Direction buttons must not contain div flow content");
  assert.match(source, /<button type="button" aria-pressed=\{selected === o\.id\} className=\{`inspector-comment /, "Direction buttons must expose the same selected state programmatically that the active visual treatment communicates");
});

test("deleting the selected Review Direction restores keyboard focus and announces the change", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /addDirectionButton\s*=\s*useRef<HTMLButtonElement>\(null\)/, "Review must retain a stable focus target outside the deleted Direction");
  assert.match(source, /<button ref=\{addDirectionButton\} type="button" aria-label="Add Direction"/, "the focus target must be the visible Add Direction control");
  assert.match(source, /editor\.removeObjects\(\[obj\.id\]\); setReattach\(\(current\) => current === obj\.id \? null : current\); setSelected\(null\); setAnnouncement\("Direction deleted\. Focus moved to Add Direction\."\); requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/, "Delete must cancel reattachment for that Direction, announce the state change, and move focus after removal");
  assert.match(source, /\{announcement && <p role="status">\{announcement\}<\/p>\}/, "Review must expose deletion feedback through a polite live status");
  assert.match(source, /setAnnouncement\(""\);\s*setSelected\(id\);/, "starting a new Direction must clear stale deletion feedback");
});

test("stale Review selection only claims focus movement when Add Direction exists", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /setAnnouncement\(locked \? "Selected Direction is no longer available\." : "Selected Direction is no longer available\. Focus moved to Add Direction\."\);/, "locked Review must not announce focus movement to a control that is not rendered");
  assert.match(source, /if \(!locked\) requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/, "focus recovery must remain limited to draft Review where Add Direction is available");
});

test("stale Review reattachment is canceled when its Direction disappears", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(!reattach \|\| data\.objects\.some\(\(object\) => object\.id === reattach\)\) return;\s*setReattach\(null\);\s*setAnnouncement\("Reattachment canceled because that Direction is no longer available\."\);/s, "acknowledged data removing the reattachment target must cancel the orphaned intent and announce it");
});

test("changing acknowledged Review identity cancels stale reattachment intent", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /useEffect\(\(\) => \{\s*if \(!reattach\) return;\s*setReattach\(null\);\s*setMessage\(""\);\s*setAnnouncement\("Reattachment canceled because this Review changed\."\);\s*\}, \[boardIdentity\]\);/s, "a reattachment started on one Review must be canceled and announced when acknowledged board identity changes");
});

test("locking Review cancels active reattachment intent and instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(!locked \|\| !reattach\) return;\s*setReattach\(null\);\s*setMessage\(""\);\s*setAnnouncement\("Reattachment canceled because this Review is now locked\."\);/s, "submitted or otherwise locked Review must cancel reattachment and clear its stale click instruction");
});

test("an upload finishing after Review locks cannot add a Direction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /const lockedRef = useRef\(locked\);\s*lockedRef\.current = locked;/, "Review must retain the latest lock state across an in-flight upload");
  assert.match(source, /const asset = await uploadAsset\(project\.id, file\); if \(boardIdentityRef\.current !== startedFor\) return; if \(lockedRef\.current\) \{ setMessage\("Upload finished after this Review was locked, so the attachment was not added\."\); return; \} add\(/, "upload completion must reject a stale board and re-check current lock state before adding its Direction");
});

test("an upload finishing after Review identity changes cannot mutate the new Review", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /async function replacement[\s\S]*?const startedFor = boardIdentity;[\s\S]*?await uploadAsset\(project\.id, file\); if \(boardIdentityRef\.current !== startedFor\) return;/, "replacement uploads must bind completion to the acknowledged Review identity that started them");
  assert.match(source, /catch \(e\) \{ if \(boardIdentityRef\.current !== startedFor\) return; setMessage\(/, "a failed upload from an obsolete Review must not surface its error in the replacement Review");
});

test("stale Review uploads cannot keep or corrupt the new board upload busy state", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /setCompletedCommand\(null\);\s*setUploading\(0\);[\s\S]*?\}, \[board\.id, board\.status, board\.version\]\);/s, "acknowledging a new Review identity must release upload busy state owned by the previous board even when the same acknowledgement also clears other board-scoped UI state");
  assert.match(source, /finally \{ if \(boardIdentityRef\.current === startedFor\) setUploading\(\(n\) => Math\.max\(0, n - 1\)\); \}/, "obsolete upload completion must not decrement the replacement Review's independent upload count");
});

test("locking Review closes a stale submission dialog", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(!locked \|\| !submit\) return;\s*setSubmit\(null\);\s*setAnnouncement\("Submission dialog closed because this Review is now locked\."\);/s, "an acknowledged lock transition must remove the stale submit action and announce why it disappeared");
});

test("successful Review submission closes the dialog before refresh acknowledgement", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(boardIdentityRef\.current !== startedFor\) return;/, "command completion must reject a stale board before mutating current Review state");
  assert.match(source, /setMessage\(""\); commandGate\.current\.completed = action; setCompletedCommand\(action\); if \(action === "submit_revision"\) \{ setSubmit\(null\); setAnnouncement\("Revision submitted\. Refreshing Review status\."\); \}/, "a confirmed current-board submission must clear stale command errors, complete the gate, close the dialog, and announce refresh progress");
  assert.match(source, /setAnnouncement\("Revision submitted\. Refreshing Review status\."\); \}[\s\S]*?onRefresh\(\);/, "submission acknowledgement must precede parent refresh");
});

test("Review commands synchronously gate duplicate transitions and release pending state", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /const commandGate = useRef<\{ pending: boolean; completed: string \| null \}>\(\{ pending: false, completed: null \}\);/, "Review must keep command transition state in a synchronous ref rather than relying only on deferred React state");
  assert.match(source, /if \(commandGate\.current\.pending \|\| uploading \|\| commandGate\.current\.completed === action\) throw new Error[\s\S]*?commandGate\.current\.pending = true; setBusy\(true\);/, "a second same-tick command must be rejected before React can rerender the disabled control");
  assert.match(source, /finally \{ commandGate\.current\.pending = false; setBusy\(false\); \}/, "submit and withdraw commands must release both synchronous and rendered busy locks on success and failure");
  assert.match(source, /onClick=\{\(\) => \{ const startedFor = boardIdentity; void command\("withdraw_revision"\)\.catch\(\(e\) => \{ if \(boardIdentityRef\.current === startedFor\) setMessage\(e\.message\); \}\); \}\}/, "withdrawal failures must return control to the same Review and expose the server error");
  assert.match(source, /if \(boardIdentityRef\.current === startedFor\) setMessage\(e\.message\);/, "a withdrawal failure from stale board state must not overwrite the current Review with an obsolete error");
  assert.match(source, /\{message && <p role="alert">\{message\}<\/p>\}/, "command failures must be announced as alerts");
});

test("successful Review command clears a stale failure alert before refresh", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(boardIdentityRef\.current !== startedFor\) return; setMessage\(""\);/, "only a current-board command completion may clear the previous failure alert");
  assert.match(source, /setMessage\(""\);[\s\S]*?onRefresh\(\);/, "a successful current-board retry must clear its stale failure before acknowledged state refreshes");
});

test("confirmed Review withdrawal cannot be repeated while refresh acknowledgement is delayed", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /commandGate\.current\.completed = action; setCompletedCommand\(action\);[\s\S]*?action === "withdraw_revision"\) setAnnouncement\("Revision withdrawn\. Refreshing Review status\."\); onRefresh\(\);/, "a confirmed withdrawal must synchronously remember that the command already succeeded and announce refresh progress");
  assert.match(source, /disabled=\{busy \|\| completedCommand === "withdraw_revision"\}/, "the stale submitted view must not allow a second withdrawal after the server already confirmed the first one");
});

test("acknowledged Review state resets the completed-command gate", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /commandGate\.current\.completed = null;\s*setCompletedCommand\(null\);[\s\S]*?\}, \[board\.id, board\.status, board\.version\]\);/s, "a completed command must stop blocking future lifecycle actions once newer acknowledged board state arrives");
});
