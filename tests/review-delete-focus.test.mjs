import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

test("locking Review cancels active reattachment intent and instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(!locked \|\| !reattach\) return;\s*setReattach\(null\);\s*setMessage\(""\);\s*setAnnouncement\("Reattachment canceled because this Review is now locked\."\);/s, "submitted or otherwise locked Review must cancel reattachment and clear its stale click instruction");
});

test("an upload finishing after Review locks cannot add a Direction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /const lockedRef = useRef\(locked\);\s*lockedRef\.current = locked;/, "Review must retain the latest lock state across an in-flight upload");
  assert.match(source, /const asset = await uploadAsset\(project\.id, file\); if \(lockedRef\.current\) \{ setMessage\("Upload finished after this Review was locked, so the attachment was not added\."\); return; \} add\(/, "upload completion must re-check the current lock state before adding its Direction");
});

test("locking Review closes a stale submission dialog", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /if \(!locked \|\| !submit\) return;\s*setSubmit\(false\);\s*setAnnouncement\("Submission dialog closed because this Review is now locked\."\);/s, "an acknowledged lock transition must remove the stale submit action and announce why it disappeared");
});

test("successful Review submission closes the dialog before refresh acknowledgement", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /await api\([\s\S]*?delete keys\.current\[action\]; if \(action === "submit_revision"\) \{ setSubmit\(false\); setAnnouncement\("Revision submitted\. Refreshing Review status\."\); \} onRefresh\(\);/, "a confirmed submission must remove the actionable dialog and announce refresh progress before relying on parent refresh");
});

test("Review commands always release busy state and withdrawal failures remain actionable", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /async function command\(action: string\)[\s\S]*?setBusy\(true\); try \{[\s\S]*?\} finally \{ setBusy\(false\); \} \}/, "submit and withdraw commands must release their busy lock on both success and failure");
  assert.match(source, /disabled=\{busy\} onClick=\{\(\) => command\("withdraw_revision"\)\.catch\(\(e\) => setMessage\(e\.message\)\)\}/, "withdrawal failures must return control to the customer and expose the server error");
  assert.match(source, /\{message && <p role="alert">\{message\}<\/p>\}/, "command failures must be announced as alerts");
});
