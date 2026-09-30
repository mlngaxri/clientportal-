(() => {
  "use strict";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const key = "fourthform-operations-preview-v1";
  let state = {
    page: "Home",
    heading: "A quieter kind of dining.",
    description:
      "Seasonal Japanese dining, shaped by the coast. An intimate room in the heart of Brisbane.",
    cta: "Reserve a table",
    seoTitle: "Mori House — Seasonal Japanese dining in Brisbane",
    seoDescription:
      "A considered Japanese dining experience in Brisbane. Seasonal produce, a warm room and an evening worth slowing down for.",
    domain: "morihouse.com.au",
    domainChecked: false,
    pro: false,
    launch: [true, false, false, false, false],
    connections: { reservations: false, forms: true, social: false },
    scheduled: true,
    stateName: "Evening service",
    stateHeading: "An evening, thoughtfully prepared.",
    stateStart: "17:00",
    stateEnd: "22:00",
    stateDays: [2, 3, 4, 5, 6],
    savedAt: null,
  };
  const initialOperations = structuredClone(state);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved === "object") state = { ...state, ...saved };
  } catch {}
  state.cmsPages = state.cmsPages || {};
  const previousSnapshot = window.ffLocalSnapshot;
  window.ffLocalSnapshot = () => ({
    ...previousSnapshot?.(),
    operations: structuredClone(state),
  });
  addEventListener("fourthform:restore", (e) => {
    if (e.detail.operations) {
      state = structuredClone(e.detail.operations);
      views.forEach(render);
      localStorage.setItem(key, JSON.stringify(state));
    }
  });
  addEventListener("fourthform:reset", () => {
    state = { ...structuredClone(initialOperations), cmsPages: {} };
    localStorage.removeItem(key);
    views.forEach(render);
  });
  const pageDefaults = {
    Home: {
      heading: "A quieter kind of dining.",
      description:
        "Seasonal Japanese dining, shaped by the coast. An intimate room in the heart of Brisbane.",
      cta: "Reserve a table",
    },
    Menu: {
      heading: "Seasonal dishes, made to share.",
      description:
        "Fresh produce. Considered flavours. Seven seasonal courses, or an evening of your own making.",
      cta: "View chef’s menu",
    },
    Visit: {
      heading: "Dinner in Brisbane.",
      description:
        "An intimate room in the heart of Brisbane. Tuesday through Saturday, from 5:30pm.",
      cta: "Reserve a table",
    },
  };
  const views = [
    "pages",
    "analytics",
    "seo",
    "domains",
    "connections",
    "states",
    "billing",
    "launch",
  ];
  const names = {
    pages: "Pages",
    analytics: "Analytics",
    seo: "Search",
    domains: "Domains",
    connections: "Connections",
    states: "States",
    billing: "Billing",
    launch: "Launch",
  };
  const center = document.querySelector(".center");
  views.forEach((name) => {
    let panel = document.querySelector(`[data-view-panel="${name}"]`);
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "view";
      panel.dataset.viewPanel = name;
      center.append(panel);
    }
    panel.classList.add("ops-panel");
  });
  const nav = document.querySelector("#leftRail .nav");
  ["analytics", "seo", "domains", "connections", "states", "billing"].forEach(
    (name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.view = name;
      b.textContent = names[name];
      b.onclick = () => {
        showView(name);
        document.querySelector("#projectMeta").textContent = names[name];
      };
      nav.append(b);
    },
  );
  const contextNotes = {
    pages: [
      "Content, considered.",
      "Small updates stay true to your design. Save when you’re happy, then open the full website to see it in context.",
      "A bigger change?",
      "Collect a Direction in Review. You can be precise without having to redesign the page.",
    ],
    analytics: [
      "The useful signals.",
      "Visitors show your audience. Reservations show intent. Look for patterns over time, rather than a single busy day.",
      "A little perspective.",
      "This sample project illustrates a typical month. Change the period or export a report to explore the experience.",
    ],
    seo: [
      "Before they arrive.",
      "Your page title and description are often the first words a new visitor reads. Keep them specific, natural and useful.",
      "Write for people.",
      "Your business name, location and what makes you different are a good place to start.",
    ],
    domains: [
      "One familiar address.",
      "A primary domain gives every page a consistent home. Your www address redirects people there automatically.",
      "Take your time.",
      "Keep your domain provider account. The connection changes where the address leads, not who owns it.",
    ],
    connections: [
      "A direct path.",
      "Useful connections make the website feel effortless. A booking button, a working form, the right social profile.",
      "Only the essentials.",
      "Connect what your visitors need. You can return and add more whenever the business changes.",
    ],
    states: [
      "Same design. Different moment.",
      "A State changes selected content for a scheduled window. Outside that window, your usual website returns.",
      "When times overlap.",
      "Give a special event a higher priority. Equal-priority conflicts keep your usual content.",
    ],
    billing: [
      "Ownership stays simple.",
      "Your Core website remains included. Pro is an optional monthly subscription, with no change to the design you own.",
      "A considered upgrade.",
      "Explore the capabilities before deciding. This preview never collects payment information.",
    ],
  };
  Object.entries(contextNotes).forEach(([name, copy]) => {
    let panel = document.querySelector(`[data-context="${name}"]`);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "context-view";
      panel.dataset.context = name;
      document.querySelector("#contextRail").append(panel);
    }
    panel.innerHTML = `<h2>${copy[0]}</h2><p class="sub">${copy[1]}</p><div class="quiet-card"><h3>${copy[2]}</h3><p>${copy[3]}</p></div>`;
  });
  const badge = document.createElement("span");
  badge.className = "ops-top-preview";
  badge.textContent = "Interactive preview · Sample project";
  document.querySelector("#leftRail").append(badge);
  function save(message = "Changes saved in this browser") {
    try {
      state.savedAt = new Date().toISOString();
      const serialized = JSON.stringify(state);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized)
        throw new Error("Save readback failed");
      if (saveLocal() === false) return;
      notify(message);
      document.querySelector("#saveState").textContent = "Saved on this device";
      return true;
    } catch {
      notify("Could not save. Keep this tab open and export your draft.");
      document.querySelector("#saveState").textContent = "Not saved";
      return false;
    }
  }
  const button = (text, action, primary = false) =>
    `<button class="top-button ${primary ? "primary" : ""}" data-ops="${action}" type="button">${text}</button>`;
  function intro(title, lead, name) {
    return `<div class="ops-wrap"><div class="ops-eyebrow">Form / ${names[name]}</div><h1 class="ops-title">${title}</h1><p class="ops-lead">${lead}</p><select class="ops-mobile-select" aria-label="Workspace">${views.map((v) => `<option value="${v}" ${v === name ? "selected" : ""}>${names[v]}</option>`).join("")}</select>`;
  }
  const input = (label, field, type = "text", extra = "") =>
    `<label class="ops-label">${label}<input type="${type}" data-field="${field}" value="${esc(state[field])}" ${extra}></label>`;
  const mini = (heading = state.heading) =>
    `<div class="ops-mini-site"><img src="${esc(state.cmsImage || "mori/interior.webp")}" alt="Mori House dining room"><div class="ops-mini-copy"><small>Mori House · Brisbane</small><h2 data-mini-heading>${esc(heading)}</h2><p>${esc(state.description)}</p><p style="border-top:1px solid #ffffff24;padding-top:15px">${esc(state.cta)} ↗</p></div></div>`;
  function pages() {
    return (
      intro(
        "A little change. Still your website.",
        "Update the words and details. The design stays beautifully intact.",
        "pages",
      ) +
      `<div class="ops-tabs">${["Home", "Menu", "Visit"].map((p) => `<button data-page="${p}" aria-pressed="${state.page === p}">${p}</button>`).join("")}</div><div class="ops-grid"><div><div class="ops-box"><h3>${esc(state.page)} / Content</h3>${input("Main heading", "heading", "text", 'maxlength="120"')}<label class="ops-label">Introduction<textarea data-field="description" maxlength="1200">${esc(state.description)}</textarea></label>${input("Button label", "cta", "text", 'maxlength="80"')}<label class="ops-upload">Change the feature image<input type="file" accept="image/png,image/jpeg,image/webp" data-cms-image></label><div class="ops-actions">${button("Save changes", "save-cms", true)}${button("Open full preview", "open-site")}<small data-local-status>${state.savedAt ? "Saved locally" : "Ready to edit"}</small></div></div><p class="ops-notice">Your layout, spacing and typography are protected. For a bigger change, add a Direction.</p></div><div>${mini()}<p class="ops-notice">Content preview / Desktop</p></div></div></div>`
    );
  }
  function analytics() {
    return (
      intro(
        "A clear picture of your audience.",
        "The useful details, without the noise. See how people find you and what brings them closer.",
        "analytics",
      ) +
      `<div class="ops-tabs">${["7 days", "30 days", "90 days"].map((p, i) => `<button data-range="${i}" aria-pressed="${i === 1}">${p}</button>`).join("")}<button data-ops="export">Export report ↗</button></div><div class="ops-metrics">${[
        ["Visitors", "2,481", "↑ 18.4%"],
        ["Page views", "6,204", "↑ 12.8%"],
        ["Reservations", "148", "↑ 24.1%"],
        ["Average visit", "2m 36s", "↑ 8.2%"],
      ]
        .map(
          (v) =>
            `<div class="ops-metric"><small>${v[0]}</small><strong data-metric>${v[1]}</strong><span>${v[2]} from previous period</span></div>`,
        )
        .join(
          "",
        )}</div><div class="ops-box"><h3>Visitors over time</h3><svg class="ops-chart" viewBox="0 0 720 170" preserveAspectRatio="none" role="img" aria-label="Sample visitor activity over thirty days"><defs><linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#71806b" stop-opacity=".2"/><stop offset="1" stop-color="#71806b" stop-opacity="0"/></linearGradient></defs>${[30, 80, 130].map((y) => `<path d="M0 ${y}H720" stroke="#D8D5CC" stroke-dasharray="3 5"/>`).join("")}<path d="M0 130L24 108L48 120L72 90L96 95L120 105L144 67L168 92L192 78L216 110L240 89L264 97L288 57L312 69L336 80L360 54L384 64L408 70L432 32L456 55L480 71L504 44L528 49L552 34L576 62L600 32L624 46L648 28L672 37L696 17L720 25V170H0Z" fill="url(#opsFill)"/><path d="M0 130L24 108L48 120L72 90L96 95L120 105L144 67L168 92L192 78L216 110L240 89L264 97L288 57L312 69L336 80L360 54L384 64L408 70L432 32L456 55L480 71L504 44L528 49L552 34L576 62L600 32L624 46L648 28L672 37L696 17L720 25" fill="none" stroke="#71806b" stroke-width="2"/></svg><div class="ops-chart-labels"><span>1 September</span><span>15 September</span><span>30 September</span></div></div><div class="ops-grid" style="margin-top:24px"><div class="ops-box"><h3>Where people arrive</h3><table class="ops-table"><thead><tr><th>Source</th><th>Visitors</th></tr></thead><tbody>${[
        ["Google", "1,126"],
        ["Direct", "682"],
        ["Instagram", "421"],
        ["Other", "252"],
      ]
        .map((v) => `<tr><td>${v[0]}</td><td>${v[1]}</td></tr>`)
        .join(
          "",
        )}</tbody></table></div><div class="ops-box"><h3>What they explore</h3><table class="ops-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>${[
        ["Home", "2,942"],
        ["Menu", "1,806"],
        ["Reservations", "1,021"],
        ["About", "435"],
      ]
        .map((v) => `<tr><td>${v[0]}</td><td>${v[1]}</td></tr>`)
        .join("")}</tbody></table></div></div></div>`
    );
  }
  function seo() {
    return (
      intro(
        "Make a good first impression.",
        "Shape the way your website appears in search, and give people a clear reason to visit.",
        "seo",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>Home / Search appearance</h3>${input("Page title", "seoTitle", "text", 'maxlength="160"')}<label class="ops-label">Description<textarea data-field="seoDescription" maxlength="500">${esc(state.seoDescription)}</textarea></label><div class="ops-actions">${button("Save search details", "save", true)}${button("Inspect page", "inspect-seo")}</div><div class="ops-line"><span>Page indexing</span><span class="ops-status">Visible to search engines</span></div><div class="ops-line"><span>Canonical URL</span><span>morihouse.com.au/</span></div></div><div><div class="ops-search-result"><small>morihouse.com.au ›</small><h3 data-search-title>${esc(state.seoTitle)}</h3><p data-search-description>${esc(state.seoDescription)}</p></div><p class="ops-notice">Search preview. Search engines may adjust the title and description they show.</p><div class="ops-box"><h3>Page health</h3><div class="ops-line"><span>Search title</span><span class="ops-status" data-search-health>${state.seoTitle.trim() ? "Present" : "Missing title"}</span></div><div class="ops-line"><span>Social sharing image</span><span class="ops-status">Ready</span></div><div class="ops-line"><span>Structured restaurant details</span><span class="ops-status">Complete</span></div></div></div></div></div>`
    );
  }
  function domains() {
    return (
      intro(
        "Your address on the web.",
        "Bring your own domain. We’ll keep the connection clear and the certificate taken care of.",
        "domains",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>Primary domain</h3>${input("Domain name", "domain", "text", 'placeholder="yourbusiness.com.au"')}<div class="ops-actions">${button("Check connection", "check-domain", true)}</div><div class="ops-line"><span>Domain status</span><span class="ops-status" data-domain-status>${state.domainChecked ? "Connected" : "Ready for verification"}</span></div><div class="ops-line"><span>Security certificate</span><span>${state.domainChecked ? "Active · HTTPS" : "Issued after connection"}</span></div><div class="ops-line"><span>www redirect</span><span>Redirects to your primary domain</span></div></div><div class="ops-box"><h3>DNS records</h3><p>Add these records with your domain provider, then check the connection.</p><table class="ops-table"><thead><tr><th>Type / Name</th><th>Value</th></tr></thead><tbody><tr><td>A / @</td><td>76.76.21.21</td></tr><tr><td>CNAME / www</td><td>cname.vercel-dns.com</td></tr></tbody></table><div class="ops-actions">${button("Copy records", "copy-dns")}</div><p>The sample records illustrate the connection flow. Domain settings are preserved in this browser.</p></div></div></div>`
    );
  }
  function connections() {
    return (
      intro(
        "Everything, quietly connected.",
        "Let enquiries reach the right place and give your visitors a direct path to your business.",
        "connections",
      ) +
      `<div class="ops-box">${[
        [
          "reservations",
          "R",
          "Reservations",
          "OpenTable · Booking destination",
        ],
        ["forms", "↗", "Enquiry form", "hello@morihouse.com.au"],
        ["social", "◎", "Instagram", "@morihouse.brisbane"],
      ]
        .map(
          ([id, mark, title, desc]) =>
            `<div class="ops-line"><div class="ops-inline"><div class="ops-connection-mark">${mark}</div><div>${title}<p>${desc}</p></div></div><button class="top-button" data-connect="${id}">${state.connections[id] ? "Connected · Edit" : "Connect"}</button></div>`,
        )
        .join(
          "",
        )}</div><div class="ops-grid" style="margin-top:24px"><div class="ops-box"><h3>Contact form</h3><p>Submissions arrive by email. Each includes the name, contact details and message your visitor leaves.</p>${button("Send a test enquiry", "test-form")}</div><div class="ops-box"><h3>Privacy and consent</h3><p>Visitors choose how their information is used. Essential measurement stays simple and respectful.</p><label class="ops-inline" style="font-size:11px"><input type="checkbox" checked> Show a consent notice for optional tracking</label></div></div></div>`
    );
  }
  function states() {
    return (
      intro(
        "The right website. At the right moment.",
        "A lunch menu at midday. A different welcome in the evening. Schedule content that follows your business.",
        "states",
      ) +
      `<div class="ops-grid"><div><div class="ops-box"><h3>Evening service <span style="float:right" class="ops-status">${state.scheduled ? "Scheduled" : "Paused"}</span></h3>${input("State name", "stateName")}${input("Alternate heading", "stateHeading")}<div class="ops-tabs">${["S", "M", "T", "W", "T", "F", "S"].map((d, i) => `<button data-day="${i}" aria-label="${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}" aria-pressed="${state.stateDays.includes(i)}">${d}</button>`).join("")}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${input("From", "stateStart", "time")}${input("Until", "stateEnd", "time")}</div><p>Australia / Brisbane · End time is exclusive. Overnight schedules belong to the day they begin.</p><div class="ops-actions">${button("Save schedule", "save-state", true)}${button(state.scheduled ? "Pause State" : "Resume State", "toggle-state")}</div></div><div class="ops-state-card"><h3>Your usual website</h3><p>Always the fallback. Nothing is lost when a State finishes.</p></div></div><div>${mini(state.stateHeading)}<div class="ops-tabs" style="margin-top:18px"><button data-state-preview="base" aria-pressed="false">Usual content</button><button data-state-preview="state" aria-pressed="true">Evening service</button></div><p class="ops-notice">State preview / Wednesday, 6:00pm. Scheduled content inherits your website’s design.</p></div></div></div>`
    );
  }
  function billing() {
    return (
      intro(
        "Simple from the start.",
        "Your website is yours. Core stays included. Pro adds a little more capability when you need it.",
        "billing",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>${state.pro ? "Fourthform Pro" : "Fourthform Core"} <span class="ops-status" style="float:right">${state.pro ? "Active" : "Included"}</span></h3><div class="ops-plan-price">${state.pro ? "A$39" : "A$0"}<small> / month</small></div><p>${state.pro ? "Scheduled States. Advanced insights. Search intelligence. Your existing website, more capable." : "Safe content updates, basic analytics, search details and domain management. Included with your website."}</p><div class="ops-actions">${button(state.pro ? "Manage subscription" : "Explore Pro", state.pro ? "manage-pro" : "upgrade-pro", true)}</div><div class="ops-line"><span>Payment method</span><span>Visa ending 4242</span></div><div class="ops-line"><span>Billing email</span><span>hello@morihouse.com.au</span></div>${button("Update billing details", "billing-details")}</div><div class="ops-box"><h3>Website payments</h3><table class="ops-table"><tbody><tr><td>Initial payment · 18 Sep</td><td>A$200 · Paid</td></tr><tr><td>Remaining balance</td><td>A$1,300 · ${state.launch[1] ? "Paid" : "After approval"}</td></tr><tr><td>Included revision rounds</td><td>3</td></tr><tr><td>Additional revision</td><td>A$150 / round</td></tr></tbody></table><div class="ops-actions">${button("View initial receipt", "receipt")}</div><p>All prices are in Australian dollars.</p></div></div></div>`
    );
  }
  function launch() {
    const count = state.launch.filter(Boolean).length;
    return (
      intro(
        count === 5 ? "A new beginning." : "Bring it live.",
        "One considered last check. Your website, ready to meet the world.",
        "launch",
      ) +
      `<div class="ops-grid"><div><div class="ops-progress"><span style="width:${count * 20}%"></span></div><p class="ops-notice">${count} of 5 essentials ready</p>${[
        [
          "Website approval",
          "You’re happy with the final website.",
          "approve-site",
        ],
        [
          "Remaining balance",
          "A$1,300 · Complete your website payment.",
          "pay-balance",
        ],
        [
          "Domain connection",
          state.domain + " · Secure connection.",
          "launch-domain",
        ],
        [
          "Enquiries and analytics",
          "Your contact form and measurement are ready.",
          "verify-integrations",
        ],
        [
          "Final launch check",
          "Responsive pages, search details and a last look.",
          "final-check",
        ],
      ]
        .map(
          ([title, desc, action], i) =>
            `<div class="ops-line"><div>${title}<p>${esc(desc)}</p></div>${state.launch[i] ? '<span class="ops-status">Ready</span>' : button(i === 1 ? "Review payment" : "Check", action)}</div>`,
        )
        .join(
          "",
        )}<div class="ops-actions">${button(count === 5 ? "Launch website" : "Complete the essentials first", "go-live", true)}</div></div><div>${mini()}<p class="ops-notice">Your finished website / Mori House</p></div></div></div>`
    );
  }
  const renderers = {
    pages,
    analytics,
    seo,
    domains,
    connections,
    states,
    billing,
    launch,
  };
  function render(name) {
    document.querySelector(`[data-view-panel="${name}"]`).innerHTML =
      renderers[name]();
    document.querySelectorAll(".ops-mobile-select").forEach(
      (s) =>
        (s.onchange = () => {
          showView(s.value);
          document.querySelector("#projectMeta").textContent = names[s.value];
        }),
    );
  }
  views.forEach(render);
  const originalShowView = showView;
  showView = function (name) {
    originalShowView(name);
    const ops = views.includes(name);
    document.querySelector("#submitBtn").style.display = ops ? "none" : "";
    document.querySelector("#saveBtn").style.display =
      ops && !["pages", "seo", "states"].includes(name) ? "none" : "";
    if (ops) document.querySelector("#projectMeta").textContent = names[name];
    if (name === "analytics" && state.analyticsRange !== undefined)
      document.querySelector(`[data-range="${state.analyticsRange}"]`)?.click();
  };
  document.querySelector("#saveBtn").addEventListener(
    "click",
    (e) => {
      if (!views.includes(currentView)) return;
      e.stopImmediatePropagation();
      const action = { pages: "save-cms", seo: "save", states: "save-state" }[
        currentView
      ];
      document
        .querySelector(
          `[data-view-panel="${currentView}"] [data-ops="${action}"]`,
        )
        ?.click();
    },
    true,
  );

  function applyCms(page) {
    const content = state.cmsPages[page];
    if (!content) return;
    const template = document.createElement("template");
    template.innerHTML = pageState[page] || defaultPages[page];
    const root = template.content;
    const h = root.querySelector("h1");
    if (h) h.textContent = content.heading;
    const hero = h?.parentElement;
    let copy = hero?.querySelector("p");
    if (!copy && hero) {
      copy = document.createElement("p");
      copy.setAttribute("data-edit-text", "");
      hero.append(copy);
    }
    if (copy) copy.textContent = content.description;
    if (state.cmsImage) {
      const img = root.querySelector("[data-edit-image] img");
      if (img) img.src = state.cmsImage;
    }
    pageState[page] = template.innerHTML;
    if (currentPage === page) {
      moriPage.innerHTML = pageState[page];
      document.querySelector("#reserveBtn").textContent = content.cta;
      bindSite();
      bindCarousel();
    }
  }
  const originalRenderPage = renderPage;
  renderPage = function (page) {
    originalRenderPage(page);
    applyCms(page);
  };
  document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-cms-image]")) return;
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1500000
    ) {
      notify("Choose a JPG, PNG or WebP under 1.5 MB for this local preview.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.cmsImage = reader.result;
      render("pages");
      document.querySelector("#saveState").textContent = "Unsaved changes";
    };
    reader.readAsDataURL(file);
  });
  let opsModal, opsReturnFocus;
  function closeOpsDialog() {
    if (!opsModal?.isConnected) return;
    closeModal("#opsModal");
    opsModal.remove();
    opsModal = null;
    if (opsReturnFocus?.isConnected) opsReturnFocus.focus();
    else document.querySelector(".view.active button")?.focus();
  }
  function dialog(title, copy, actions) {
    closeOpsDialog();
    opsReturnFocus = document.activeElement;
    const el = document.createElement("div");
    el.className = "modal-backdrop";
    el.id = "opsModal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="modal"><small>Fourthform / ${state.pro ? "Pro" : "Core"}</small><h2 id="opsModalTitle">${title}</h2><p>${copy}</p><div class="modal-actions">${button("Back", "close-dialog")}${actions || ""}</div></div>`;
    el.setAttribute("aria-labelledby", "opsModalTitle");
    document.body.append(el);
    opsModal = el;
    openModal("#opsModal");
    el.addEventListener("click", (e) => {
      if (e.target === el) closeOpsDialog();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOpsDialog();
  });
  function updateSearchHealth() {
    const el = document.querySelector("[data-search-health]");
    if (el)
      el.textContent = state.seoTitle.trim() ? "Present" : "Missing title";
  }
  document.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    state[field] = e.target.value;
    if(field === "domain"){state.domainChecked=false;state.launch[2]=false;document.querySelector("[data-domain-status]").textContent="Needs verification";}
    document
      .querySelectorAll("[data-mini-heading]")
      .forEach(
        (el) =>
          (el.textContent =
            field === "stateHeading" ? state.stateHeading : state.heading),
      );
    document
      .querySelectorAll("[data-search-title]")
      .forEach((el) => (el.textContent = state.seoTitle));
    document
      .querySelectorAll("[data-search-description]")
      .forEach((el) => (el.textContent = state.seoDescription));
    document.querySelector("#saveState").textContent = "Unsaved changes";
    markDirty();
    updateSearchHealth();
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest(
      "[data-ops],[data-day],[data-page],[data-range],[data-state-preview],[data-connect]",
    );
    if (!el) return;
    if (el.dataset.page) {
      state.cmsPages[state.page] = {
        heading: state.heading,
        description: state.description,
        cta: state.cta,
      };
      state.page = el.dataset.page;
      Object.assign(
        state,
        state.cmsPages[state.page] || pageDefaults[state.page],
      );
      render("pages");
      return;
    }
    if (el.dataset.range) {
      const i = +el.dataset.range;
      state.analyticsRange = i;
      document
        .querySelectorAll("[data-range]")
        .forEach((b) => b.setAttribute("aria-pressed", b === el));
      const vals = [
        ["642", "1,612", "38", "2m 18s"],
        ["2,481", "6,204", "148", "2m 36s"],
        ["7,423", "18,648", "426", "2m 42s"],
      ][i];
      document
        .querySelectorAll("[data-metric]")
        .forEach((m, n) => (m.textContent = vals[n]));
      const svg = document.querySelector(".ops-chart");
      const series = [
        [54, 83, 61, 98, 72, 110, 88],
        [
          40, 62, 50, 80, 74, 64, 102, 77, 91, 59, 80, 72, 112, 100, 89, 115,
          105, 99, 137, 114, 98, 125, 120, 135, 107, 137, 123, 141, 132, 152,
          144,
        ],
        [38, 61, 57, 84, 74, 104, 97, 113, 89, 126, 117, 143],
      ][i];
      const line = series
        .map(
          (v, n) =>
            (n ? "L" : "M") +
            ((n * 720) / (series.length - 1)).toFixed(1) +
            " " +
            (170 - v),
        )
        .join("");
      const paths = svg.querySelectorAll("path");
      paths[paths.length - 1].setAttribute("d", line);
      paths[paths.length - 2].setAttribute("d", line + "V170H0Z");
      svg.setAttribute(
        "aria-label",
        "Sample visitor activity over " + el.textContent,
      );
      const dates = document.querySelector(".ops-chart-labels");
      dates.innerHTML = `<span>${["24 September", "1 September", "3 July"][i]}</span><span>${["27 September", "15 September", "17 August"][i]}</span><span>30 September</span>`;
      notify("Showing " + el.textContent.toLowerCase());
      return;
    }
    if (el.dataset.day) {
      const d = +el.dataset.day;
      state.stateDays = state.stateDays.includes(d)
        ? state.stateDays.filter((v) => v !== d)
        : [...state.stateDays, d];
      el.setAttribute("aria-pressed", state.stateDays.includes(d));
      markDirty();
      document.querySelector("#saveState").textContent = "Unsaved changes";
      return;
    }
    if (el.dataset.statePreview) {
      document.querySelector(
        '[data-view-panel="states"] [data-mini-heading]',
      ).textContent =
        el.dataset.statePreview === "base" ? state.heading : state.stateHeading;
      document
        .querySelectorAll("[data-state-preview]")
        .forEach((b) => b.setAttribute("aria-pressed", b === el));
      return;
    }
    if (el.dataset.connect) {
      const id = el.dataset.connect;
      dialog(
        "Connect " +
          (id === "forms"
            ? "your enquiries"
            : id === "social"
              ? "Instagram"
              : "reservations") +
          ".",
        "Confirm the connection for this sample project. You can explore the connected state without leaving the preview.",
        button("Confirm connection", "connect-" + id, true),
      );
      return;
    }
    const action = el.dataset.ops;
    if (action === "close-dialog") {
      closeOpsDialog();
      return;
    }
    if (action.startsWith("connect-")) {
      state.connections[action.slice(8)] = true;
      save("Connection saved locally");
      render("connections");
      closeOpsDialog();
      return;
    }
    switch (action) {
      case "save":
        save();
        render("seo");
        break;
      case "save-cms":
        state.cmsPages[state.page] = {
          heading: state.heading,
          description: state.description,
          cta: state.cta,
        };
        applyCms(state.page);
        save();
        render("pages");
        break;
      case "open-site":
        showView("review");
        selectPage(state.page);
        break;
      case "save-state":
        if (
          !state.stateName.trim() ||
          !state.stateDays.length ||
          !/^\d{2}:\d{2}$/.test(state.stateStart) ||
          !/^\d{2}:\d{2}$/.test(state.stateEnd) ||
          state.stateStart === state.stateEnd
        ) {
          notify(
            "Add a name, select days and choose different start and end times.",
          );
          break;
        }
        save("Schedule saved locally");
        render("states");
        break;
      case "toggle-state":
        state.scheduled = !state.scheduled;
        save(state.scheduled ? "State resumed" : "State paused");
        render("states");
        break;
      case "check-domain":
        state.domain=state.domain.trim().toLowerCase();
        if (
          !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(
            state.domain,
          )
        ) {
          notify("Enter a domain without https:// or a page path.");
          break;
        }
        state.domainChecked = true;
        save("Sample domain connection checked");
        render("domains");
        break;
      case "copy-dns":
        if(!navigator.clipboard){notify("Copy A @ 76.76.21.21 and CNAME www cname.vercel-dns.com");break;}
        navigator.clipboard
          .writeText("A @ 76.76.21.21\nCNAME www cname.vercel-dns.com")
          .then(() => notify("DNS records copied"))
          .catch(() =>
            notify("Copy A @ 76.76.21.21 and CNAME www cname.vercel-dns.com"),
          );
        break;
      case "inspect-seo": {
        const title = state.seoTitle.trim(),
          desc = state.seoDescription.trim();
        const checks = [
          title.length >= 20 && title.length <= 65
            ? "Your title is a useful length."
            : `Title: ${title.length} characters. Aim for 20–65 for a clear search result.`,
          desc.length >= 70 && desc.length <= 160
            ? "Your description is a useful length."
            : `Description: ${desc.length} characters. Aim for 70–160 to describe the page clearly.`,
          title
            ? "A search title is present."
            : "Add a search title before publishing.",
          desc
            ? "A description is present."
            : "Add a description before publishing.",
        ];
        dialog(
          "A considered search result.",
          checks.map(esc).join("<br><br>"),
          button("Done", "close-dialog", true),
        );
        break;
      }
      case "upgrade-pro":
        dialog(
          "The same website. More possibility.",
          "Scheduled States, deeper analytics and search intelligence. A$39 a month. Explore the Pro experience in this preview; no payment is taken.",
          button("Explore Pro experience", "confirm-pro", true),
        );
        break;
      case "confirm-pro":
        state.pro = true;
        save("Pro preview activated");
        render("billing");
        closeOpsDialog();
        break;
      case "manage-pro":
        dialog(
          "Your Pro subscription.",
          "A$39 / month. Next invoice: 30 October. Your Core website remains included if you end Pro.",
          button("End Pro preview", "cancel-pro"),
        );
        break;
      case "cancel-pro":
        state.pro = false;
        save("Core preview restored");
        render("billing");
        closeOpsDialog();
        break;
      case "billing-details":
        dialog(
          "Billing details.",
          "Mori House · hello@morihouse.com.au · Visa ending 4242. Payment details are illustrative and no card information is collected.",
          button("Done", "close-dialog", true),
        );
        break;
      case "receipt":
        dialog(
          "Your initial payment.",
          "Mori House / Site · A$200 · 18 September 2026. Remaining balance: A$1,300 after approval. This sample receipt is part of the product preview.",
          button("Done", "close-dialog", true),
        );
        break;
      case "test-form":
        dialog(
          "Your enquiry reaches you.",
          "From: Sam Taylor · sam@example.test. “We’d love to reserve a table for four this Friday.” The preview shows how an enquiry appears; no email is sent.",
          button("Looks good", "close-dialog", true),
        );
        break;
      case "approve-site":
        state.launch[0] = true;
        save("Website approved in preview");
        render("launch");
        break;
      case "pay-balance":
        dialog(
          "Your website, ready for the world.",
          "Remaining balance: A$1,300. Review the completed-payment state in this preview. No checkout opens and no money is taken.",
          button("Preview completed payment", "confirm-balance", true),
        );
        break;
      case "confirm-balance":
        state.launch[1] = true;
        save("Completed payment state selected");
        render("launch");
        render("billing");
        closeOpsDialog();
        break;
      case "launch-domain":
        state.launch[2] = true;
        state.domainChecked = true;
        save("Sample domain check complete");
        render("launch");
        render("domains");
        break;
      case "verify-integrations":
        state.launch[3] = true;
        save("Sample integrations check complete");
        render("launch");
        break;
      case "final-check":
        state.launch[4] = true;
        save("Final preview check complete");
        render("launch");
        break;
      case "go-live":
        if (!state.launch.every(Boolean)) {
          notify("Complete all five essentials before continuing.");
          break;
        }
        dialog(
          "A new beginning.",
          "Your sample launch journey is complete. Mori House is ready in this preview. No real website or domain is changed.",
          button("Return to overview", "launch-done", true),
        );
        break;
      case "launch-done":
        closeOpsDialog();
        showView("overview");
        notify("Launch journey complete");
        break;
      case "export": {
        const factor = [0.259, 1, 2.992][state.analyticsRange ?? 1];
        const csv =
          "Sample period," +
          [7, 30, 90][state.analyticsRange ?? 1] +
          " days\nSource,Visitors\n" +
          [
            ["Google", 1126],
            ["Direct", 682],
            ["Instagram", 421],
            ["Other", 252],
          ]
            .map(([source, count]) => source + "," + Math.round(count * factor))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mori-house-sample-analytics.csv";
        a.click();
        URL.revokeObjectURL(a.href);
        notify("Sample report downloaded");
        break;
      }
    }
  });
})();
