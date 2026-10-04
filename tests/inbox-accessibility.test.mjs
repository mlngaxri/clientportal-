import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/InboxWorkspace.tsx", "utf8");

test("enquiry status actions announce progress before awaiting the server", () => {
  assert.match(source, /const restoring = value === "new" && messages\.find\(item => item\.id === id\)\?\.status === "archived";/);
  assert.match(source, /setPendingRows\(rows => \[\.\.\.rows, id\]\);\s*setError\(""\);\s*setNotice\(restoring \? "Restoring enquiry…" : value === "new" \? "Marking enquiry unread…" : value === "read" \? "Marking enquiry read…" : "Archiving enquiry…"\);\s*try \{\s*await api/s);
  assert.match(source, /setNotice\(restoring \? "Enquiry restored\." : `Enquiry \$\{value === "new" \? "marked unread" : value === "read" \? "marked read" : "archived"\}\.``?\);/);
  assert.match(source, /\{notice && <p role="status">\{notice\}<\/p>\}/);
  assert.match(source, /catch \(e\) \{\s*setError\(\(e as Error\)\.message\);\s*setNotice\(""\);/s);
});
