import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Dialog captures its return focus before autofocus children mount", async () => {
  const source = await readFile("components/Dialog.tsx", "utf8");

  assert.match(
    source,
    /const previousFocus = useRef<HTMLElement \| null>\(typeof document === "undefined" \? null : document\.activeElement as HTMLElement \| null\);/,
    "Dialog must capture the invoking control during render, before a child autoFocus can move focus inside the dialog",
  );
  assert.match(
    source,
    /if \(previousFocus\.current\?\.isConnected\) previousFocus\.current\.focus\(\);/,
    "Dialog must restore focus to the connected invoking control when it closes",
  );
  assert.doesNotMatch(
    source,
    /useEffect\(\(\) => \{[\s\S]*?const previousFocus = document\.activeElement/,
    "Dialog must not wait until its effect to discover return focus because autoFocus children have already committed by then",
  );
});
