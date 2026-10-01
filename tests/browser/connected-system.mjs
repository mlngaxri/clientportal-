import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const service = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  base = env.APP_URL;
const browser = await chromium.launch({ headless: true });
await mkdir("test-results", { recursive: true });
const errors = [],
  results = [];
let ownerPage,
  operatorPage,
  secondPage,
  otherPage,
  id,
  ownerClient,
  definition,
  asset;
const password = `Fourthform-test-${randomUUID()}`,
  email = `owner-${randomUUID()}@example.test`;
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, result: "pass" });
    console.log(JSON.stringify({ name, result: "pass" }));
  } catch (e) {
    results.push({ name, result: "fail", error: e.message });
    throw e;
  }
}
async function page() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  return p;
}
async function call(p, path, data) {
  return p.evaluate(
    async ({ path, data }) => {
      const r = await fetch(path, {
        method: data === undefined ? "GET" : "POST",
        headers:
          data === undefined ? {} : { "Content-Type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const value = await r.json().catch(() => ({}));
      return { status: r.status, value };
    },
    { path, data },
  );
}
async function ok(p, path, data) {
  const r = await call(p, path, data);
  assert.ok(
    r.status >= 200 && r.status < 300,
    `${path}: HTTP ${r.status}, ${r.value.error || ""}`,
  );
  return r.value;
}
async function visual(p, name) {
  await p.locator(".route-state").waitFor({ state: "hidden" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `test-results/${name}.png` });
  console.log(
    `FF_SYSTEM_VISUAL_${name}=${(await p.screenshot({ type: "jpeg", quality: 55 })).toString("base64")}`,
  );
}
async function current() {
  return ok(ownerPage, `/api/projects/${id}`);
}
async function command(p, action, payload = {}, board) {
  const { project } = await current();
  return ok(p, `/api/projects/${id}/command`, {
    action,
    payload,
    expected: board?.version ?? project.version,
    key: randomUUID(),
  });
}
async function signIn(p, who, pass = password) {
  await p.goto(base + "/start");
  await ok(p, "/api/auth", {
    mode: "signin",
    email: who,
    password: pass,
    remember: true,
  });
}
async function paymentFixture(kind, amount) {
  const reservation = await ownerClient.rpc("reserve_checkout", {
    pid: id,
    payment_kind: kind,
  });
  assert.equal(reservation.error, null);
  const session = `cs_fixture_${randomUUID()}`;
  assert.equal(
    (
      await service.rpc("bind_checkout", {
        pid: id,
        payment_kind: kind,
        reservation_key: reservation.data.key,
        session_id: session,
      })
    ).error,
    null,
  );
  assert.equal(
    (
      await service.rpc("record_payment", {
        event_id: `evt_fixture_${randomUUID()}`,
        session_id: session,
        pid: id,
        payment_kind: kind,
        amount,
        currency_code: "aud",
      })
    ).error,
    null,
  );
}
try {
  await check(
    "real email/password signup uses HTTP-only sessions",
    async () => {
      ownerPage = await page();
      await ownerPage.goto(base + "/start");
      await ownerPage.getByLabel("Email", { exact: true }).fill(email);
      await ownerPage.getByLabel("Password", { exact: true }).fill(password);
      await ownerPage
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await ownerPage.getByLabel("Business name", { exact: true }).waitFor();
      const cookies = await ownerPage.context().cookies();
      assert.ok(cookies.some((c) => c.name.startsWith("sb-") && c.httpOnly));
    },
  );
  await check(
    "business information persists through the real API",
    async () => {
      await ownerPage
        .getByLabel("Business name", { exact: true })
        .fill("Cedar Workshop");
      await ownerPage
        .getByLabel("What does your business do?")
        .fill("Handmade furniture for everyday living.");
      await ownerPage
        .getByRole("button", { name: "Contact us", exact: true })
        .click();
      await ownerPage
        .getByRole("button", { name: "Save & continue", exact: true })
        .click();
      await ownerPage
        .getByRole("button", { name: "Pay A$200 and start", exact: true })
        .waitFor();
      const projects = await ok(ownerPage, "/api/projects");
      id = projects[0].id;
      assert.equal(projects[0].name, "Cedar Workshop");
    },
  );
  await check(
    "a missing Stripe service cannot create paid status",
    async () => {
      const r = await call(ownerPage, "/api/checkout", {
        projectId: id,
        kind: "initial",
      });
      assert.equal(r.status, 503);
      assert.equal((await current()).project.initial_paid_at, null);
    },
  );
  await check(
    "payment test receipts exercise the real authoritative lifecycle",
    async () => {
      ownerClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } },
      );
      assert.equal(
        (await ownerClient.auth.signInWithPassword({ email, password })).error,
        null,
      );
      await paymentFixture("initial", 20000);
      assert.equal((await current()).project.phase, "DIRECTION");
    },
  );
  await check(
    "Initial Direction saves and submits to the real account",
    async () => {
      const board = (await current()).boards.find((b) => b.kind === "initial");
      await command(
        ownerPage,
        "save_board",
        {
          boardId: board.id,
          data: {
            objects: [
              {
                id: "intro",
                type: "text",
                text: "A calm website for our handcrafted furniture.",
              },
            ],
          },
        },
        board,
      );
      const saved = (await current()).boards.find((b) => b.kind === "initial");
      await command(ownerPage, "send_initial", { boardId: saved.id }, saved);
      assert.equal((await current()).project.revision_used, 0);
    },
  );
  await check(
    "customer credentials cannot invoke agency build actions",
    async () => {
      const { project } = await current();
      const r = await call(ownerPage, `/api/projects/${id}/command`, {
        action: "begin_build",
        payload: {},
        expected: project.version,
        key: randomUUID(),
      });
      assert.ok(r.status >= 400);
      const opEmail = `operator-${randomUUID()}@example.test`;
      const created = await service.auth.admin.createUser({
        email: opEmail,
        password,
        email_confirm: true,
        app_metadata: { role: "operator" },
      });
      assert.equal(created.error, null);
      operatorPage = await page();
      await signIn(operatorPage, opEmail);
      await command(operatorPage, "begin_build");
      assert.equal((await current()).project.phase, "BUILDING");
    },
  );
  await check(
    "uploads go directly to private storage and finalize after byte validation",
    async () => {
      const bytes = await readFile("public/mori/interior.webp");
      const reserved = await ok(ownerPage, `/api/projects/${id}/upload`, {
        name: "cedar.webp",
        size: bytes.length,
        mime: "image/webp",
      });
      const uploaded = await fetch(reserved.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp", "x-upsert": "false" },
        body: bytes,
      });
      assert.ok(uploaded.ok, "Signed upload failed");
      const result = await ownerPage.evaluate(
        async ({ id, upload }) => {
          const r = await fetch(`/api/projects/${id}/upload`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: upload }),
          });
          return { status: r.status, value: await r.json() };
        },
        { id, upload: reserved.id },
      );
      assert.equal(result.status, 200, result.value.error);
      asset = result.value.id;
      const anonymous = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-assets/${id}/${asset}.webp`,
      );
      assert.ok(!anonymous.ok);
    },
  );
  await check(
    "agency connects a real customer site with stable editable fields",
    async () => {
      definition = {
        manifest: {
          siteId: id,
          revision: "1",
          theme: {
            layout: "editorial",
            background: "#f3f1e9",
            ink: "#191a18",
            accent: "#d8ddc8",
            name: "Cedar Workshop",
          },
          pages: [
            {
              id: "home",
              path: "/",
              title: "Home",
              fields: [
                {
                  id: "heading",
                  kind: "text",
                  role: "heading",
                  label: "Main heading",
                  maxLength: 160,
                },
                {
                  id: "description",
                  kind: "text",
                  role: "body",
                  label: "Introduction",
                  maxLength: 3000,
                },
                {
                  id: "hero-image",
                  kind: "image",
                  role: "image",
                  label: "Main image",
                },
                {
                  id: "hero-alt",
                  kind: "text",
                  role: "image-alt",
                  label: "Image description",
                  maxLength: 300,
                },
                {
                  id: "action-label",
                  kind: "text",
                  role: "action-label",
                  label: "Action label",
                  maxLength: 80,
                },
                {
                  id: "action-link",
                  kind: "link",
                  role: "action-link",
                  label: "Action destination",
                  maxLength: 2000,
                },
                {
                  id: "more-information",
                  kind: "link",
                  label: "Explore the workshop",
                  maxLength: 2000,
                },
              ],
            },
          ],
        },
        content: {
          fields: {
            heading: "Furniture for everyday living.",
            description: "Thoughtfully made pieces for the rooms you use most.",
            "hero-image": asset,
            "hero-alt": "Workshop image",
            "action-label": "Start a conversation",
            "action-link": "#contact",
            "more-information": "/#contact",
          },
          seo: {
            home: {
              title: "Cedar Workshop | Handmade furniture",
              description:
                "Thoughtfully made furniture for the rooms you use most.",
              noindex: false,
            },
          },
        },
      };
      await ok(operatorPage, `/api/projects/${id}/setup`, definition);
      await command(operatorPage, "internal_check");
      await command(operatorPage, "deliver", { url: `${base}/review/${id}` });
      assert.equal((await current()).project.phase, "REVIEW");
    },
  );
  await check(
    "the delivered review site and real element-targeting bridge work",
    async () => {
      await ownerPage.goto(`${base}/projects/${id}/review`);
      const heading = ownerPage
        .frameLocator('iframe[title="Your website"]')
        .locator("h1");
      await heading.waitFor();
      assert.equal(
        await heading.textContent(),
        "Furniture for everyday living.",
      );
      await ownerPage.waitForFunction(
        () => !document.querySelector(".bridge-notice"),
      );
      await heading.click();
      await ownerPage
        .getByRole("textbox", { name: "Direction text" })
        .fill(
          "Please make the main heading more specific to handmade furniture.",
        );
      await ownerPage
        .getByRole("button", { name: "Save Direction", exact: true })
        .click();
      await ownerPage.waitForTimeout(1200);
      const board = (await current()).boards.find(
        (b) => b.kind === "revision" && b.status === "DRAFT",
      );
      assert.equal(
        board.data.objects[0].target.selector,
        '[data-fourthform-id="heading"]',
      );
      assert.ok(board.data.objects[0].text.includes("handmade"));
      await visual(ownerPage, "real-review");
    },
  );
  await check(
    "a submitted revision is immutable and withdrawal restores its round",
    async () => {
      const board = (await current()).boards.find(
        (b) => b.kind === "revision" && b.status === "DRAFT",
      );
      await command(ownerPage, "submit_revision", { boardId: board.id }, board);
      assert.equal((await current()).project.revision_used, 1);
      const sent = (await current()).boards.find((b) => b.id === board.id);
      const attempted = await call(ownerPage, `/api/projects/${id}/command`, {
        action: "save_board",
        payload: { boardId: sent.id, data: { objects: [] } },
        expected: sent.version,
        key: randomUUID(),
      });
      assert.equal(attempted.status, 409);
      await command(ownerPage, "withdraw_revision", { boardId: sent.id }, sent);
      assert.equal((await current()).project.revision_used, 0);
    },
  );
  await check(
    "review content is saved independently of website publishing",
    async () => {
      await ownerPage.goto(`${base}/projects/${id}/pages`);
      await ownerPage
        .getByLabel("Main heading", { exact: true })
        .fill("Handmade furniture, shaped around your home.");
      await ownerPage
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await ownerPage
        .getByText("Draft saved to your account.", { exact: true })
        .waitFor();
      const anonymous = await fetch(`${base}/sites/${id}`);
      assert.equal(anonymous.status, 404);
    },
  );
  await check(
    "a separate browser session loads saved work from the account",
    async () => {
      secondPage = await page();
      await signIn(secondPage, email);
      await secondPage.goto(`${base}/projects/${id}/pages`);
      assert.equal(
        await secondPage
          .getByLabel("Main heading", { exact: true })
          .inputValue(),
        "Handmade furniture, shaped around your home.",
      );
    },
  );
  await check(
    "another customer cannot read or mutate this project",
    async () => {
      const otherEmail = `other-${randomUUID()}@example.test`;
      assert.equal(
        (
          await service.auth.admin.createUser({
            email: otherEmail,
            password,
            email_confirm: true,
          })
        ).error,
        null,
      );
      otherPage = await page();
      await signIn(otherPage, otherEmail);
      const r = await call(otherPage, `/api/projects/${id}`);
      assert.equal(r.status, 404);
      const escaped = await call(otherPage, `/api/projects/${id}/site`);
      assert.equal(escaped.status, 404);
    },
  );
  await check(
    "approval and final-payment reconciliation gate launch",
    async () => {
      const revision = (await current()).boards.find(
        (b) => b.kind === "revision" && b.status === "DRAFT",
      );
      if (revision.data.objects.length)
        await command(
          ownerPage,
          "save_board",
          { boardId: revision.id, data: { objects: [] } },
          revision,
        );
      await command(ownerPage, "approve");
      assert.equal(
        (await current()).project.phase,
        "APPROVED_AWAITING_FINAL_PAYMENT",
      );
      await paymentFixture("final", 130000);
      assert.equal((await current()).project.phase, "LAUNCH");
    },
  );
  await check(
    "launch checks probe the actual deployment and exact saved revision",
    async () => {
      await command(ownerPage, "save_launch", {
        data: { domain: new URL(base).hostname },
      });
      const checks = await ok(ownerPage, `/api/projects/${id}/checks`, {});
      assert.equal(checks.checks.length, 5);
      assert.ok(checks.checks.every((c) => c.evidence.revision === "2"));
      await command(ownerPage, "launch");
      assert.equal((await current()).project.phase, "LIVE");
    },
  );
  await check(
    "published pages include real search metadata, sitemap and live content",
    async () => {
      const live = await page();
      await live.goto(`${base}/sites/${id}`);
      assert.equal(
        await live.locator("h1").textContent(),
        "Handmade furniture, shaped around your home.",
      );
      assert.equal(await live.title(), "Cedar Workshop | Handmade furniture");
      assert.equal(await live.getByRole("link", {name: "Explore the workshop"}).getAttribute("href"), `${base}/sites/${id}#contact`);
      assert.equal(
        await live.locator('link[rel="canonical"]').getAttribute("href"),
        `${base}/sites/${id}`,
      );
      assert.ok((await fetch(`${base}/sites/${id}/sitemap.xml`)).ok);
      await visual(live, "real-customer-site");
      await live.context().close();
    },
  );
  await check(
    "publishing, HTTP inspection and rollback update the delivered website",
    async () => {
      const original = await ok(ownerPage, `/api/projects/${id}/site`),
        content = {
          ...original.content,
          fields: {
            ...original.content.fields,
            heading: "A new published heading.",
          },
        },
        key = randomUUID();
      const payload = {
        action: "publish",
        content,
        expectedRevision: original.manifest.revision,
        key,
      };
      await ok(ownerPage, `/api/projects/${id}/site`, payload);
      await ok(ownerPage, `/api/projects/${id}/site`, payload);
      const body = await (await fetch(`${base}/sites/${id}`)).text();
      assert.ok(body.includes("A new published heading."));
      const inspection = await ok(
        ownerPage,
        `/api/projects/${id}/inspect?page=home`,
      );
      assert.ok(inspection.checks.every((c) => c.status === "pass"));
      const updated = await ok(ownerPage, `/api/projects/${id}/site`);
      await ok(ownerPage, `/api/projects/${id}/site`, {
        action: "rollback",
        versionId: original.history[0].id,
        expectedRevision: updated.manifest.revision,
        key: randomUUID(),
      });
      assert.ok(
        (await (await fetch(`${base}/sites/${id}`)).text()).includes(
          "Handmade furniture, shaped around your home.",
        ),
      );
    },
  );
  await check(
    "real visitor events and enquiry forms reach the account",
    async () => {
      const visitor = await page();
      await visitor.goto(`${base}/sites/${id}`);
      await visitor
        .getByLabel("Your name", { exact: true })
        .fill("Alex Visitor");
      await visitor
        .getByLabel("Email address", { exact: true })
        .fill("alex@example.test");
      await visitor
        .getByLabel("Your message", { exact: true })
        .fill("Could we talk about a handmade dining table?");
      await visitor
        .getByRole("button", { name: "Send message", exact: false })
        .click();
      await visitor
        .getByText(
          "Your message has been received. Thank you for getting in touch.",
          { exact: true },
        )
        .waitFor();
      const inbox = await ok(ownerPage, `/api/projects/${id}/forms`);
      assert.equal(inbox.messages[0].name, "Alex Visitor");
      const tracked = await fetch(`${base}/api/collect/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          "User-Agent": "Mozilla/5.0 Fourthform Acceptance Browser",
        },
        body: JSON.stringify({
          id: randomUUID(),
          pageId: "home",
          kind: "pageview",
          referrer: "https://search.example.org/results",
        }),
      });
      assert.ok(tracked.ok);
      const stats = await ok(
        ownerPage,
        `/api/projects/${id}/analytics?days=30`,
      );
      assert.equal(stats.forms, 1);
      assert.ok(stats.views >= 1);
      assert.equal(stats.pro, false);
      assert.equal(stats.comparison, null);
      const unconsented = await visitor.evaluate(
        async ({ id }) => {
          const r = await fetch(`/api/collect/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "sec-gpc": "1" },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              pageId: "home",
              kind: "pageview",
              referrer: "",
            }),
          });
          return r.status;
        },
        { id },
      );
      assert.equal(unconsented, 204);
      await visitor.context().close();
    },
  );
  await check(
    "scheduled Pro content executes on the real site and stops after cancellation",
    async () => {
      await service.from("projects").update({ pro: true }).eq("id", id);
      const states = (await current()).boards.find((b) => b.kind === "states");
      await command(
        ownerPage,
        "save_board",
        {
          boardId: states.id,
          data: {
            objects: [],
            states: [
              {
                id: "day",
                title: "Every day",
                enabled: true,
                timezone: "Australia/Brisbane",
                days: [0, 1, 2, 3, 4, 5, 6],
                start: "00:00",
                end: "12:00",
                priority: 1,
                overrides: { heading: "Today in the workshop." },
              },
              {
                id: "night",
                title: "Every evening",
                enabled: true,
                timezone: "Australia/Brisbane",
                days: [0, 1, 2, 3, 4, 5, 6],
                start: "12:00",
                end: "00:00",
                priority: 1,
                overrides: { heading: "Today in the workshop." },
              },
            ],
          },
        },
        states,
      );
      assert.ok(
        (await (await fetch(`${base}/sites/${id}`)).text()).includes(
          "Today in the workshop.",
        ),
      );
      const report = await ok(
        ownerPage,
        `/api/projects/${id}/analytics?days=90`,
      );
      assert.equal(report.pro, true);
      assert.ok(report.comparison);
      const insights = await ok(
        ownerPage,
        `/api/projects/${id}/inspect?page=home`,
      );
      assert.ok(insights.insights.length);
      await service.from("projects").update({ pro: false }).eq("id", id);
      assert.ok(
        (await (await fetch(`${base}/sites/${id}`)).text()).includes(
          "Handmade furniture, shaped around your home.",
        ),
      );
    },
  );
  await check(
    "inbox, reports, connections, billing and settings remain usable on a phone",
    async () => {
      await ownerPage.setViewportSize({ width: 390, height: 844 });
      for (const section of [
        "pages",
        "analytics",
        "inbox",
        "seo",
        "connections",
        "domains",
        "billing",
        "settings",
        "build",
      ]) {
        await ownerPage.goto(`${base}/projects/${id}/${section}`);
        await ownerPage.locator("h1").waitFor();
        if (section === "analytics") await ownerPage.locator(".connected-metrics").waitFor();
        if (section === "inbox") await ownerPage.getByRole("heading", { name: "Alex Visitor", exact: true }).waitFor();
        if (section === "seo") await ownerPage.getByRole("button", { name: "Inspect the published page", exact: true }).waitFor();
        if (section === "connections") await ownerPage.getByLabel("Booking page", { exact: true }).waitFor();
        if (section === "domains") await ownerPage.locator(".connected-code").filter({ hasText: `/sites/${id}` }).waitFor();
        if (section === "billing") await ownerPage.getByRole("cell", { name: "initial", exact: true }).waitFor();
        if (section === "settings") {
          await ownerPage.getByLabel("Business timezone", { exact: true }).waitFor();
          await visual(ownerPage, "real-phone-settings");
        }
        if (section === "build") await ownerPage.getByText("Website launched", { exact: true }).waitFor();
        const overflow = await ownerPage.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        assert.equal(overflow, false, section);
      }
      await ownerPage.getByText("Website launched", { exact: true }).waitFor();
      await visual(ownerPage, "real-phone-build");
    },
  );
  await check(
    "logout revokes the local session and protected reads require authentication",
    async () => {
      await ok(secondPage, "/api/auth", { mode: "logout" });
      const r = await call(secondPage, `/api/projects/${id}`);
      assert.equal(r.status, 401);
    },
  );
  await check(
    "password recovery uses an actual local email and PKCE callback",
    async () => {
      await secondPage.goto(base + "/account/recover");
      await secondPage.getByLabel("Email", { exact: true }).fill(email);
      await secondPage
        .getByRole("button", { name: "Send recovery link", exact: true })
        .click();
      await secondPage
        .getByText(
          "If this address has an account, a recovery link will arrive shortly. Open it in this browser.",
          { exact: true },
        )
        .waitFor();
      let link;
      for (let attempt = 0; attempt < 20 && !link; attempt++) {
        const inbox = await fetch(
          "http://127.0.0.1:54324/api/v1/messages",
        ).then((r) => r.json());
        const message = inbox.messages?.find(
          (m) =>
            m.To?.some((to) => to.Address === email) &&
            /reset|recover/i.test(m.Subject),
        );
        if (message) {
          const detail = await fetch(
            `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
          ).then((r) => r.json());
          link = String(detail.HTML || detail.Text || "")
            .match(/https?:[^"<>\s]+\/auth\/v1\/verify[^"<>\s]+/)?.[0]
            ?.replaceAll("&amp;", "&");
        }
        if (!link) await new Promise((r) => setTimeout(r, 500));
      }
      assert.ok(link, "Local SMTP did not return the recovery link.");
      await secondPage.goto(link);
      await secondPage.getByLabel("New password", { exact: true }).waitFor();
      const newPassword = `Fourthform-recovered-${randomUUID()}`;
      await secondPage
        .getByLabel("New password", { exact: true })
        .fill(newPassword);
      await secondPage
        .getByLabel("Confirm password", { exact: true })
        .fill(newPassword);
      await secondPage
        .getByRole("button", { name: "Save password", exact: true })
        .click();
      await secondPage
        .getByText(
          "Your password has been updated. You can return to your projects.",
          { exact: true },
        )
        .waitFor();
      const recovered = await page();
      await signIn(recovered, email, newPassword);
      assert.equal((await ok(recovered, `/api/projects/${id}`)).project.id, id);
      const existingProof = (await otherPage.context().cookies()).find((c) => c.name === "ff-session-until")?.value;
      const stale = await call(otherPage, "/api/auth", {
        mode: "signin",
        email,
        password,
      });
      assert.ok(stale.status >= 400);
      assert.equal((await otherPage.context().cookies()).find((c) => c.name === "ff-session-until")?.value, existingProof, "Failed authentication must not extend an existing signed session.");
      await recovered.context().clearCookies({ name: "ff-session-until" });
      assert.equal(
        (await call(recovered, `/api/projects/${id}`)).status,
        401,
        "An unsigned missing session lifetime cannot retain account access.",
      );
      await recovered.context().close();
    },
  );
  assert.deepEqual(errors, []);
  console.log(
    "Real Supabase Auth, Postgres, storage and browser flows passed. Stripe settlement used explicit test receipts; no provider payment is claimed.",
  );
} catch (e) {
  console.error("CONNECTED_SYSTEM_FAILURE", e.stack);
  if (ownerPage)
    await ownerPage
      .screenshot({ path: "test-results/failure.png" })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(
    "test-results/connected-system.json",
    JSON.stringify(
      {
        checks: results,
        uncaughtErrors: errors,
        paymentBoundary:
          "Explicit administrator test receipts. Live Stripe, Google, domain and email acceptance require configured staging.",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
