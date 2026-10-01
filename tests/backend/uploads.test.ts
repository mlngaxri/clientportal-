import { test } from "node:test";
import assert from "node:assert/strict";
import {
  uploadMetadata,
  validateUploadContent,
  needsMalwareScan,
} from "../../lib/uploads";
import { assetType } from "../../lib/upload-client";
test("upload metadata rejects empty/oversized/executable extensions", () => {
  assert.throws(() => uploadMetadata("a.png", 0));
  assert.throws(() => uploadMetadata("a.exe", 1));
  assert.throws(() => uploadMetadata("a.jpg", 101, "", 100));
  assert.equal(
    uploadMetadata("voice.webm", 20, "audio/webm").mime,
    "audio/webm",
  );
  assert.equal(uploadMetadata("report.pdf", 20).mime, "application/pdf");
});
test("signature verification rejects spoofed files and preserves safe text", () => {
  assert.throws(() =>
    validateUploadContent(
      new TextEncoder().encode("<html><script>bad</script>"),
      "jpg",
    ),
  );
  assert.throws(() => validateUploadContent(new Uint8Array([137, 80]), "png"));
  assert.doesNotThrow(() =>
    validateUploadContent(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "png",
    ),
  );
  assert.doesNotThrow(() =>
    validateUploadContent(new TextEncoder().encode("Meeting notes"), "txt"),
  );
  assert.throws(() =>
    validateUploadContent(new Uint8Array([127, 69, 76, 70]), "txt"),
  );
  assert.ok(needsMalwareScan("zip"));
  assert.ok(needsMalwareScan("pdf"));
  assert.equal(assetType("application/pdf"), "file");
  assert.equal(assetType("audio/webm"), "audio");
});
