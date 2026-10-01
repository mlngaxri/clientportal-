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
  const readableHeading = (node) => {
    if (!node) return "";
    const copy = node.cloneNode(true);
    copy.querySelectorAll("br").forEach(line => line.replaceWith(document.createTextNode(" ")));
    return copy.textContent.replace(/\s+/g, " ").trim();
  };
  const model=window.ffPortalModel;
  const key = window.ffStorageKey("fourthform-operations-preview-v1");
  let state = {
    page: "Home",
    heading: "A quieter kind of dining.",
    description:
      "Seasonal Japanese dining, shaped by the coast. An intimate room in the heart of Brisbane.",
    cta: "Reserve a table",
    seoTitle: "Mori House | Seasonal Japanese dining in Brisbane",
    seoDescription:
      "A considered Japanese dining experience in Brisbane. Seasonal produce, a warm room and an evening worth slowing down for.",
    domain: "morihouse.com.au",
    domainChecked: false,
    pro: false,
    launch: [true, false, false, false, false],
    connections: { reservations: false, forms: true, social: false },
    scheduled: true,
    trackingConsent: true,
    stateName: "Evening service",
    stateHeading: "An evening, thoughtfully prepared.",
    stateStart: "17:00",
    stateEnd: "22:00",
    stateDays: [2, 3, 4, 5, 6],
    savedAt: null,
  };
  const initialOperations = structuredClone(state);
  let projectRecord=null;
  try {
    projectRecord=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    const saved = projectRecord?.operations||JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved === "object") state = model.normalizeOperations(initialOperations,saved);
  } catch {}
  state.cmsPages = state.cmsPages || {};
  state.cmsDrafts = state.cmsDrafts || {};
  // Migrate the older shared image to the page it was edited on.
  if(state.cmsImage){const page=state.page||"Home";state.image=state.cmsImage;if(state.cmsPages[page])state.cmsPages[page].image=state.cmsImage;else state.cmsDrafts[page]={heading:state.heading,description:state.description,cta:state.cta,image:state.cmsImage,imageAlt:"Mori House dining room"};delete state.cmsImage;}
  function cmsDraft(){return {heading:state.heading,description:state.description,cta:state.cta,image:state.image||"",imageAlt:state.imageAlt||"Mori House dining room"};}
  function retainCmsDraft(){model.stageCms(state,state.page,cmsDraft());}
  function pageFields(page){
    const template=document.createElement('template');template.innerHTML=pageState[page]||defaultPages[page];
    const h=template.content.querySelector('h1'),copy=h?.parentElement.querySelector('p'),img=template.content.querySelector('[data-edit-image] img');
    return {...pageDefaults[page],heading:readableHeading(h)||pageDefaults[page].heading,description:copy?.textContent||'',image:img?.getAttribute('src')||'',imageAlt:img?.getAttribute('alt')||'',cta:state.cmsPages[page]?.cta||pageDefaults[page].cta};
  }
  function loadPageFields(){Object.assign(state,pageFields(state.page),state.cmsDrafts[state.page]||{});}


  const previousSnapshot = window.ffLocalSnapshot;
  window.ffLocalSnapshot = () => ({
    ...previousSnapshot?.(),
    operations: structuredClone(state),
  });
  addEventListener("fourthform:restore", (e) => {
    cmsImageVersion++;
    if (e.detail.operations) {
      state = model.normalizeOperations(initialOperations,e.detail.operations);
      views.forEach(render);
      try{localStorage.setItem(key, JSON.stringify(state));}catch{notify("Restored in this tab. Save or export to keep your changes.");}
    }
  });
  addEventListener("fourthform:reset", () => {
    cmsImageVersion++;
    state = { ...structuredClone(initialOperations), cmsPages: {},cmsDrafts: {} };
    try{localStorage.removeItem(key);}catch{notify("Device storage could not be cleared.");}
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
  Object.keys(pageDefaults).forEach(page=>{
    const template=document.createElement("template");template.innerHTML=defaultPages[page];
    const heading=template.content.querySelector("h1");
    const copy=heading?.parentElement.querySelector("p");
    const image=template.content.querySelector("[data-edit-image] img");
    pageDefaults[page]={...pageDefaults[page],cta:document.querySelector("#reserveBtn").textContent,heading:readableHeading(heading)||pageDefaults[page].heading,description:copy?.textContent||pageDefaults[page].description,image:image?.getAttribute("src")||"",imageAlt:image?.getAttribute("alt")||"Mori House dining room"};
  });
  if(!state.savedAt&&!Object.keys(state.cmsDrafts).length)Object.assign(state,pageDefaults[state.page]||pageDefaults.Home);
  Object.assign(initialOperations,pageDefaults.Home);
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
      "Choose the moment.",
      "Select the days and start and end times. Use the preview to compare your usual content with the scheduled version.",
    ],
    billing: [
      "Ownership stays simple.",
      "Core is included after launch for content updates, basic analytics, search details and domain management. Pro is optional at A$39 / month.",
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
  badge.textContent = "Interactive preview · Example project";
  document.querySelector("#leftRail").append(badge);
  function save(message = "Changes saved in this browser") {
    let previousRecord=null;const previousTime=state.savedAt;
    try {
      previousRecord=localStorage.getItem(key);
      state.savedAt = new Date().toISOString();
      const serialized = JSON.stringify(state);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized)
        throw new Error("Save readback failed");
      if (saveLocal() === false) throw new Error("Device snapshot failed");
      notify(message);
      document.querySelector("#saveState").textContent = "Saved on this device";
      return true;
    } catch {
      state.savedAt=previousTime;try{if(previousRecord===null)localStorage.removeItem(key);else localStorage.setItem(key,previousRecord);}catch{}
      markDirty();
      notify("Could not save. Keep this tab open and export your draft.");
      document.querySelector("#saveState").textContent = "Not saved";
      return false;
    }
  }
  function commitState(change,message){
    const previous=structuredClone(state);change();
    if(save(message))return true;
    state=previous;markDirty();return false;
  }
  const button = (text, action, primary = false) =>
    `<button class="top-button ${primary ? "primary" : ""}" data-ops="${action}" type="button">${text}</button>`;
  function intro(title, lead, name) {
    return `<div class="ops-wrap"><div class="ops-eyebrow">Form / ${names[name]}</div><h1 class="ops-title">${title}</h1><p class="ops-lead">${lead}</p><select class="ops-mobile-select" aria-label="Workspace">${(window.ffPreviewSpace?.views||views).filter(v=>views.includes(v)).map((v) => `<option value="${v}" ${v === name ? "selected" : ""}>${names[v]}</option>`).join("")}</select>`;
  }
  const input = (label, field, type = "text", extra = "") =>
    `<label class="ops-label">${label}<input type="${type}" data-field="${field}" value="${esc(state[field])}" ${extra}></label>`;
  const siteContent=()=>state.cmsPages.Home||pageDefaults.Home;
  const mini = (heading = state.heading,content=cmsDraft()) =>
    `<div class="ops-mini-site"><img src="${esc(content.image || pageDefaults[state.page]?.image || "mori/interior.webp")}" alt="${esc(content.imageAlt||"Mori House dining room")}"><div class="ops-mini-copy"><small>Mori House · Brisbane</small><h2 data-mini-heading>${esc(heading)}</h2><p>${esc(content.description)}</p><p style="border-top:1px solid #ffffff24;padding-top:15px">${esc(content.cta)} ↗</p></div></div>`;
  function pages() {
    return (
      intro(
        "Keep your website current.",
        "Update headings, photos and button labels. Preview each change before saving. Your layout and typography stay intact.",
        "pages",
      ) +
      `<div class="ops-tabs">${["Home", "Menu", "Visit"].map((p) => `<button data-page="${p}" aria-pressed="${state.page === p}">${p}</button>`).join("")}</div><div class="ops-grid"><div><div class="ops-box"><h3>${esc(state.page)} / Content</h3>${input("Main heading", "heading", "text", 'maxlength="120"')}<label class="ops-label">Introduction<textarea data-field="description" maxlength="1200">${esc(state.description)}</textarea></label>${input("Button label", "cta", "text", 'maxlength="80"')}${input("Image description", "imageAlt", "text", 'maxlength="180"')}<label class="ops-upload">Change the feature image<input type="file" accept="image/png,image/jpeg,image/webp" data-cms-image></label><div class="ops-actions">${button("Save changes", "save-cms", true)}${button("Open full preview", "open-site")}<small data-local-status>${state.savedAt ? "Saved locally" : "Ready to edit"}</small></div></div><p class="ops-notice">Save applies your content changes to the example website. For a change to the design, add a Direction in Review.</p></div><div>${mini()}<p class="ops-notice">Content preview / Desktop</p></div></div></div>`
    );
  }
  function analyticsReport(i){const visitors=[642,2481,7423][i],views=[1612,6204,18648][i];return {days:[7,30,90][i],visitors,views,reservations:[38,148,426][i],sources:model.distribute(visitors,[1126,682,421,252]),pages:model.distribute(views,[2942,1806,1456])};}
  function analytics() {
    return (
      intro(
        "Understand your visitors.",
        "See where people come from, which pages they explore and how often they reserve. These example figures show how the reporting works.",
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
        )}</div><div class="ops-box"><h3>Visitors over time</h3><svg class="ops-chart" viewBox="0 0 720 170" preserveAspectRatio="none" role="img" aria-label="Sample visitor activity over thirty days"><defs><linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#71806b" stop-opacity=".2"/><stop offset="1" stop-color="#71806b" stop-opacity="0"/></linearGradient></defs>${[30, 80, 130].map((y) => `<path d="M0 ${y}H720" stroke="#D8D5CC" stroke-dasharray="3 5"/>`).join("")}<path d="M0 130L24 108L48 120L72 90L96 95L120 105L144 67L168 92L192 78L216 110L240 89L264 97L288 57L312 69L336 80L360 54L384 64L408 70L432 32L456 55L480 71L504 44L528 49L552 34L576 62L600 32L624 46L648 28L672 37L696 17L720 25V170H0Z" fill="url(#opsFill)"/><path d="M0 130L24 108L48 120L72 90L96 95L120 105L144 67L168 92L192 78L216 110L240 89L264 97L288 57L312 69L336 80L360 54L384 64L408 70L432 32L456 55L480 71L504 44L528 49L552 34L576 62L600 32L624 46L648 28L672 37L696 17L720 25" fill="none" stroke="#71806b" stroke-width="2"/></svg><div class="ops-chart-labels"><span>1 September</span><span>15 September</span><span>30 September</span></div></div><div class="ops-grid" style="margin-top:24px"><div class="ops-box"><h3>Where people arrive</h3><table class="ops-table"><thead><tr><th data-report-kind="sources">Source</th><th>Visitors</th></tr></thead><tbody>${[
        ["Google", "1,126"],
        ["Direct", "682"],
        ["Instagram", "421"],
        ["Other", "252"],
      ]
        .map((v) => `<tr><td>${v[0]}</td><td>${v[1]}</td></tr>`)
        .join(
          "",
        )}</tbody></table></div><div class="ops-box"><h3>What they explore</h3><table class="ops-table"><thead><tr><th data-report-kind="pages">Page</th><th>Views</th></tr></thead><tbody>${[
        ["Home", "2,942"],
        ["Menu", "1,806"],
        ["Visit", "1,456"],
      ]
        .map((v) => `<tr><td>${v[0]}</td><td>${v[1]}</td></tr>`)
        .join("")}</tbody></table></div></div></div>`
    );
  }
  function seo() {
    return (
      intro(
        "Give people a reason to visit.",
        "Edit the title and description people may see in search. Inspect their length and completeness before you save.",
        "seo",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>Home / Search appearance</h3>${input("Page title", "seoTitle", "text", 'maxlength="160"')}<label class="ops-label">Description<textarea data-field="seoDescription" maxlength="500">${esc(state.seoDescription)}</textarea></label><div class="ops-actions">${button("Save search details", "save", true)}${button("Inspect page", "inspect-seo")}</div><div class="ops-line"><span>Page indexing</span><span class="ops-status">Visible to search engines</span></div><div class="ops-line"><span>Canonical URL</span><span>${esc(state.domain)}/</span></div></div><div><div class="ops-search-result"><small>${esc(state.domain)} ›</small><h3 data-search-title>${esc(state.seoTitle)}</h3><p data-search-description>${esc(state.seoDescription)}</p></div><p class="ops-notice">Search preview. Search engines may adjust the title and description they show.</p><div class="ops-box"><h3>Page health</h3><div class="ops-line"><span>Search title</span><span class="ops-status" data-search-health>${state.seoTitle.trim() ? "Present" : "Missing title"}</span></div><div class="ops-line"><span>Social sharing image</span><span class="ops-status">Ready</span></div><div class="ops-line"><span>Structured restaurant details</span><span class="ops-status">Complete</span></div></div></div></div></div>`
    );
  }
  function domains() {
    return (
      intro(
        "Connect your domain.",
        "Use your own website address. Follow the DNS instructions, then check the connection. Checks in this preview are simulated.",
        "domains",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>Primary domain</h3>${input("Domain name", "domain", "text", 'placeholder="yourbusiness.com.au"')}<div class="ops-actions">${button("Check connection", "check-domain", true)}</div><div class="ops-line"><span>Domain status</span><span class="ops-status" data-domain-status>${state.domainChecked ? "Connected" : "Ready for verification"}</span></div><div class="ops-line"><span>Security certificate</span><span>${state.domainChecked ? "Active · HTTPS" : "Issued after connection"}</span></div><div class="ops-line"><span>www redirect</span><span>Redirects to your primary domain</span></div></div><div class="ops-box"><h3>DNS records</h3><p>Add these records with your domain provider, then check the connection.</p><table class="ops-table"><thead><tr><th>Type / Name</th><th>Value</th></tr></thead><tbody><tr><td>A / @</td><td>76.76.21.21</td></tr><tr><td>CNAME / www</td><td>cname.vercel-dns.com</td></tr></tbody></table><div class="ops-actions">${button("Copy records", "copy-dns")}</div><p>The sample records illustrate the connection flow. Domain settings are preserved in this browser.</p></div></div></div>`
    );
  }
  function connections() {
    return (
      intro(
        "Make the next step easy.",
        "Connect your booking destination, enquiry form and social profile so visitors can reach the right place.",
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
        )}</div><div class="ops-grid" style="margin-top:24px"><div class="ops-box"><h3>Contact form</h3><p>Submissions arrive by email. Each includes the name, contact details and message your visitor leaves.</p>${button("Send a test enquiry", "test-form")}</div><div class="ops-box"><h3>Privacy and consent</h3><p>Visitors choose how their information is used. Essential measurement stays simple and respectful.</p><label class="ops-inline" style="font-size:11px"><input type="checkbox" data-setting="trackingConsent" ${state.trackingConsent?"checked":""}> Show a consent notice for optional tracking</label></div></div></div>`
    );
  }
  function states() {
    return (
      intro(
        "Schedule content for the moment.",
        "A State is a scheduled version of selected website content. Choose the days and times; your usual content returns afterwards. States are part of Pro.",
        "states",
      ) +
      `<div class="ops-grid"><div><div class="ops-box"><h3>${esc(state.stateName)} <span style="float:right" class="ops-status">${state.scheduled ? "Scheduled" : "Paused"}</span></h3>${input("State name", "stateName")}${input("Alternate heading", "stateHeading")}<div class="ops-tabs">${["S", "M", "T", "W", "T", "F", "S"].map((d, i) => `<button data-day="${i}" aria-label="${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}" aria-pressed="${state.stateDays.includes(i)}">${d}</button>`).join("")}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${input("From", "stateStart", "time")}${input("Until", "stateEnd", "time")}</div><p>Australia / Brisbane · End time is exclusive. Overnight schedules belong to the day they begin.</p><div class="ops-actions">${button("Save schedule", "save-state", true)}${button(state.scheduled ? "Pause State" : "Resume State", "toggle-state")}</div></div><div class="ops-state-card"><h3>Your usual website</h3><p>Your usual content returns when the scheduled period ends. A State keeps the same layout and typography.</p></div></div><div>${mini(state.statePreview==="base"?siteContent().heading:state.stateHeading,siteContent())}<div class="ops-tabs" style="margin-top:18px"><button data-state-preview="base" aria-pressed="${state.statePreview==='base'}">Usual content</button><button data-state-preview="state" aria-pressed="${state.statePreview!=='base'}">${esc(state.stateName)}</button></div><p class="ops-notice">Content preview. Select either version above to compare the wording and design.</p></div></div></div>`
    );
  }
  function billing() {
    return (
      intro(
        "Your plan and payments.",
        "Site is A$1,500, with A$200 to start and A$1,300 on approval. Core stays included after launch. Pro is an optional A$39 / month upgrade.",
        "billing",
      ) +
      `<div class="ops-grid"><div class="ops-box"><h3>${state.pro ? "Fourthform Pro" : "Fourthform Core"} <span class="ops-status" style="float:right">${state.pro ? "Active" : "Included"}</span></h3><div class="ops-plan-price">${state.pro ? "A$39" : "A$0"}<small> / month</small></div><p>${state.pro ? "Scheduled States, deeper analytics and search insights. An optional upgrade to your everyday toolkit." : "Content updates, basic analytics, search details and domain management. Included after launch."}</p><div class="ops-actions">${button(state.pro ? "Manage subscription" : "Explore Pro", state.pro ? "manage-pro" : "upgrade-pro", true)}</div><div class="ops-line"><span>Payment method</span><span>Visa ending 4242</span></div><div class="ops-line"><span>Billing email</span><span>hello@morihouse.com.au</span></div>${button("Update billing details", "billing-details")}</div><div class="ops-box"><h3>Website payments</h3><table class="ops-table"><tbody><tr><td>Initial payment · 18 Sep</td><td>A$200 · Paid</td></tr><tr><td>Remaining balance</td><td>A$1,300 · ${state.launch[1] ? "Paid" : "After approval"}</td></tr><tr><td>Included revision rounds</td><td>3</td></tr><tr><td>Additional revision</td><td>A$150 / round</td></tr></tbody></table><div class="ops-actions">${button(state.launch[1]?"View payment summary":"View initial receipt", "receipt")}</div><p>All prices are in Australian dollars.</p></div></div></div>`
    );
  }
  function launch() {
    const count = state.launch.filter(Boolean).length;
    return (
      intro(
        count === 5 ? "A new beginning." : "Bring it live.",
        "Approve the website, complete the balance and check the domain, connections and search details. Each step is simulated in this preview.",
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
        )}<div class="ops-actions">${button(count === 5 ? "Launch website" : "Complete the essentials first", "go-live", true)}</div></div><div>${mini(siteContent().heading,siteContent())}<p class="ops-notice">Your finished website / Mori House</p></div></div></div>`
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
    window.ffApplyDetails?.();
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
    if(name==="pages"){capturePage();loadPageFields();render("pages");}
    else if(ops)render(name);
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
    if (content.image) {
      const img = root.querySelector("[data-edit-image] img");
      if (img){img.src = content.image;img.alt=content.imageAlt||"Mori House dining room";}
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
    document.querySelector("#reserveBtn").textContent=state.cmsPages[page]?.cta||pageDefaults[page].cta;
  };
  // Legacy CMS records are materialised once; subsequent direct edits own the page HTML.
  Object.keys(state.cmsPages).filter(page=>typeof projectRecord?.pages?.[page]!=="string").forEach(applyCms);
  document.querySelector("#reserveBtn").textContent=state.cmsPages[currentPage]?.cta||pageDefaults[currentPage].cta;
  const previousMarkDirty=markDirty;
  markDirty=function(){
    if(currentView==='review'&&currentMode==='Edit site'){
      capturePage();state.cmsPages[currentPage]=pageFields(currentPage);state.launch[0]=false;state.launch[4]=false;
      // Keep an existing CMS draft: it is a deliberate, separate pending change.
    }
    previousMarkDirty();
  };
  let cmsImageVersion=0;
  document.addEventListener("change", (e) => {
    if(e.target.dataset.setting==='trackingConsent'){
      const next=e.target.checked;if(!commitState(()=>{state.trackingConsent=next;},'Consent preference saved in this preview'))e.target.checked=state.trackingConsent;return;
    }
    if (!e.target.matches("[data-cms-image]")) return;
    const version=++cmsImageVersion;
    const file = e.target.files[0];e.target.value='';
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1500000
    ) {
      notify("Choose a JPG, PNG or WebP under 1.5 MB for this local preview.");
      return;
    }
    const reader = new FileReader();
    const selectedPage=state.page;
    reader.onload = () => {
      const image=new Image();
      image.onerror=()=>notify("That file is not a readable image. Choose another JPG, PNG or WebP.");
      image.onload=()=>{if(version!==cmsImageVersion)return;if(state.page!==selectedPage){notify("Return to "+selectedPage+" to choose its image.");return;}
        state.image = reader.result;retainCmsDraft();markDirty();render("pages");document.querySelector("#saveState").textContent = "Unsaved changes";};
      image.src=reader.result;
    };
    reader.onerror=()=>notify("We could not read that image. Choose another file.");
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
    if(["heading","description","cta","imageAlt"].includes(field))retainCmsDraft();
    if(["seoTitle","seoDescription"].includes(field))state.launch[4]=false;
    if(field === "domain"){state.domainChecked=false;state.launch[2]=false;document.querySelector("[data-domain-status]").textContent="Needs verification";}
    const cmsPreview=document.querySelector('[data-view-panel="pages"] .ops-mini-site');
    if(cmsPreview&&["heading","description","cta","imageAlt"].includes(field)){cmsPreview.querySelector('h2').textContent=state.heading;const copy=cmsPreview.querySelectorAll('p');copy[0].textContent=state.description;copy[1].textContent=state.cta+' ↗';cmsPreview.querySelector('img').alt=state.imageAlt;}
    if(field==='stateHeading'&&state.statePreview!=='base')document.querySelector('[data-view-panel="states"] [data-mini-heading]').textContent=state.stateHeading;
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
    if (el.dataset.page&&!el.closest('[data-view-panel="pages"]'))return;
    if (el.dataset.page) {
      retainCmsDraft();
      state.page = el.dataset.page;
      Object.assign(
        state,
        {...pageFields(state.page),...state.cmsDrafts[state.page]},
      );
      render("pages");
      markDirty();
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
      const report=analyticsReport(i);
      for(const kind of ["sources","pages"]){const table=document.querySelector(`[data-report-kind="${kind}"]`)?.closest("table");table?.querySelectorAll("tbody tr").forEach((row,n)=>row.lastElementChild.textContent=report[kind][n].toLocaleString("en-AU"));}
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
      state.statePreview=el.dataset.statePreview;
      document.querySelector(
        '[data-view-panel="states"] [data-mini-heading]',
      ).textContent =
        el.dataset.statePreview === "base" ? siteContent().heading : state.stateHeading;
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
        state.connections[id]?button("Disconnect sample connection","disconnect-"+id):button("Confirm connection", "connect-" + id, true),
      );
      return;
    }
    const action = el.dataset.ops;
    if (action === "close-dialog") {
      closeOpsDialog();
      return;
    }
    if (!action) return;
    if(action.startsWith('disconnect-')){
      const id=action.slice(11);if(!commitState(()=>{state.connections[id]=false;if(id==='forms')state.launch[3]=false;},'Sample connection removed'))return;
      render('connections');render('launch');closeOpsDialog();return;
    }
    if (action.startsWith("connect-")) {
      if(!commitState(()=>{state.connections[action.slice(8)]=true;},"Connection saved locally"))return;
      render("connections");
      closeOpsDialog();
      return;
    }
    switch (action) {
      case "save":
        if(!save())break;
        render("seo");
        break;
      case "save-cms":
        const invalid=model.validateCms(cmsDraft());if(invalid){notify(invalid);break;}
        const change=model.prepareCms(state,state.page,cmsDraft());
        const beforeLaunch=[...state.launch];state.launch[0]=false;state.launch[4]=false;
        const beforePage=pageState[state.page],beforeDraft=structuredClone(state.cmsDrafts[state.page]||cmsDraft());
        applyCms(state.page);delete state.cmsDrafts[state.page];
        if(!save()){
          model.rollbackCms(state,change);state.launch=beforeLaunch;state.cmsDrafts[state.page]=beforeDraft;pageState[state.page]=beforePage;
          if(currentPage===state.page)renderPage(currentPage);
          markDirty();break;
        }
        render("pages");
        break;
      case "open-site":
        showView("review");
        selectPage(state.page);
        break;
      case "save-state":
        if (!model.validSchedule(state)) {
          notify(
            "Add a name, select days and choose different start and end times.",
          );
          break;
        }
        if(!save("Schedule saved locally"))break;
        render("states");
        break;
      case "toggle-state":
        if(!state.scheduled&&!model.validSchedule(state)){notify("Fix the schedule name, days and times before resuming.");break;}
        if(!commitState(()=>{state.scheduled=!state.scheduled;},state.scheduled?"State paused":"State resumed"))break;
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
        if(!commitState(()=>{state.domainChecked=true;},"Sample domain connection checked"))break;
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
          "Scheduled States, deeper analytics and search insights. A$39 / month. Try the Pro concept in this preview. No payment is taken.",
          button("Explore Pro experience", "confirm-pro", true),
        );
        break;
      case "confirm-pro":
        if(!commitState(()=>{state.pro=true;},"Pro preview activated"))break;
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
        if(!commitState(()=>{state.pro=false;},"Core preview restored"))break;
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
          state.launch[1]?"Your website payments.":"Your initial payment.",
          state.launch[1]?"Mori House / Site · A$200 initial payment and A$1,300 balance paid. Total: A$1,500. No remaining balance. This sample receipt is part of the product preview.":"Mori House / Site · A$200 · 18 September 2026. Remaining balance: A$1,300 after approval. This sample receipt is part of the product preview.",
          button("Done", "close-dialog", true),
        );
        break;
      case "test-form":
        if(!state.connections.forms){notify("Connect the enquiry form before sending a test.");break;}
        dialog(
          "Your enquiry reaches you.",
          "From: Sam Taylor · sam@example.test. “We’d love to reserve a table for four this Friday.” The preview shows how an enquiry appears; no email is sent.",
          button("Looks good", "close-dialog", true),
        );
        break;
      case "approve-site":
        if(!commitState(()=>{state.launch[0]=true;},"Website approved in preview"))break;
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
        if(!commitState(()=>{state.launch[1]=true;},"Completed payment state selected"))break;
        render("launch");
        render("billing");
        closeOpsDialog();
        break;
      case "launch-domain":
        if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(state.domain.trim())){notify("Add a valid domain in Domains before checking launch.");break;}
        if(!commitState(()=>{state.launch[2]=true;state.domainChecked=true;},"Sample domain check complete"))break;
        render("launch");
        render("domains");
        break;
      case "verify-integrations":
        if(!state.connections.forms){notify("Connect the enquiry form before checking integrations.");break;}
        if(!commitState(()=>{state.launch[3]=true;},"Sample integrations check complete"))break;
        render("launch");
        break;
      case "final-check":
        if(!state.seoTitle.trim()||!state.seoDescription.trim()){notify("Add a search title and description before the final check.");break;}
        if(!commitState(()=>{state.launch[4]=true;},"Final preview check complete"))break;
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
        const report=analyticsReport(state.analyticsRange??1);
        const csv=`Sample period,${report.days} days\nMetric,Value\nVisitors,${report.visitors}\nPage views,${report.views}\nReservations,${report.reservations}\n\nSource,Visitors\n`+["Google","Direct","Instagram","Other"].map((v,i)=>v+","+report.sources[i]).join("\n")+"\n\nPage,Views\n"+["Home","Menu","Visit"].map((v,i)=>v+","+report.pages[i]).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mori-house-"+[7,30,90][state.analyticsRange??1]+"-day-sample-analytics.csv";
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        notify("Sample report downloaded");
        break;
      }
    }
  });
})();
