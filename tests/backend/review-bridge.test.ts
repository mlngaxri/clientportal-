import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
function bridge(origin = "https://portal.test") {
  const messages: any[] = [],
    events: Record<string, Function> = {},
    docEvents: Record<string, Function> = {};
  const parent = {
    postMessage: (message: any, targetOrigin: string) =>
      messages.push({ message, targetOrigin }),
  };
  const overlay = {
    style: {},
    setAttribute() {},
    replaceChildren() {},
    appendChild() {},
  };
  const root = { appendChild() {} };
  class Element {
    dataset = { fourthformId: "heading" };
    tagName = "H1";
    textContent = "Title";
    getBoundingClientRect() {
      return { x: 10, y: 20, width: 100, height: 30 };
    }
    closest() {
      return null;
    }
    getAttribute() {
      return null;
    }
  }
  const sandbox = {
    window: { parent },
    parent,
    document: {
      currentScript: { dataset: { parentOrigin: origin } },
      documentElement: root,
      createElement: () => overlay,
      addEventListener: (name: string, handler: Function) =>
        (docEvents[name] = handler),
    },
    URL,
    CSS: { escape: (value: string) => value },
    Element,
    HTMLImageElement: class extends Element {},
    location: { pathname: "/", search: "" },
    innerWidth: 1024,
    scrollY: 0,
    addEventListener: (name: string, handler: Function) =>
      (events[name] = handler),
    requestAnimationFrame: (handler: Function) => handler(),
  };
  runInNewContext(
    readFileSync(
      new URL("../../public/review-bridge.js", import.meta.url),
      "utf8",
    ),
    sandbox,
  );
  const click = () =>
    docEvents.click({
      target: new Element(),
      preventDefault() {},
      stopPropagation() {},
    });
  return { events, parent, messages, click };
}
test("bridge verifies both message origin and source before enabling selection", () => {
  const b = bridge();
  b.events.message({
    origin: "https://evil.test",
    source: b.parent,
    data: { type: "ff-mode", enabled: true },
  });
  b.click();
  b.events.message({
    origin: "https://portal.test",
    source: {},
    data: { type: "ff-mode", enabled: true },
  });
  b.click();
  assert.equal(
    b.messages.filter((x) => x.message.type === "ff-target").length,
    0,
  );
  b.events.message({
    origin: "https://portal.test",
    source: b.parent,
    data: { type: "ff-mode", enabled: true },
  });
  b.click();
  assert.equal(
    b.messages.filter((x) => x.message.type === "ff-target").length,
    1,
  );
  assert.ok(b.messages.every((x) => x.targetOrigin === "https://portal.test"));
});
test("mode synchronization does not repeat ready messages or create a handshake loop", () => {
  const b = bridge();
  for (let i = 0; i < 10; i++)
    b.events.message({
      origin: "https://portal.test",
      source: b.parent,
      data: { type: "ff-mode", enabled: true },
    });
  assert.equal(
    b.messages.filter((x) => x.message.type === "ff-ready").length,
    1,
  );
  assert.equal(bridge("https://portal.test/path").messages.length, 0);
});
