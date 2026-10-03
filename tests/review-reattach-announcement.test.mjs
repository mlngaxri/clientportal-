import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("successful Review reattachment announces completion", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(
    source,
    /if \(reattach && patch\.target\) \{[\s\S]*?setSelected\(reattach\); setReattach\(null\); setMessage\(""\); setAnnouncement\("Direction reattached to the new website location\."\); \} else add\(patch\);/,
    "successful reattachment must clear its stale instruction and announce completion through the existing live status",
  );
  assert.match(source, /\{announcement && <p role="status">\{announcement\}<\/p>\}/, "reattachment feedback must be exposed through a polite live status");
});
