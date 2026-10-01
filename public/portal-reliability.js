/* Local preview persistence only. No account, payment or live-site mutation. */
(() => {
  const DRAFT_KEY = STORAGE_KEY + ":draft";
  const seedDirections = [
    {
      page: "Home",
      target: "home-hero",
      text: "Use the evening room image here.",
    },
    { page: "Home", target: "heading", text: "Make this feel quieter." },
  ];
  let savedAt = null,
    paused = false,
    note = null,
    pendingDraft = null;
  const originalMarkDirty = markDirty;
  const originalNotify = notify;
  const parse = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const valid = (value) =>
    value &&
    typeof value === "object" &&
    value.pages &&
    typeof value.pages === "object" &&
    ["Home", "Menu", "Visit"].every(
      (page) => typeof value.pages[page] === "string",
    ) &&
    Array.isArray(value.directions) &&
    value.directions.every(
      (d) => d && typeof d.page === "string" && typeof d.text === "string",
    );
  const stored = parse(STORAGE_KEY);
  if (stored?.savedAt) savedAt = stored.savedAt;
  function status() {
    saveState.textContent = paused
      ? "Review local draft"
      : localDirty
        ? "Unsaved changes"
        : savedAt
          ? "Saved on this device"
          : "Preview · local edits";
    qs("#saveBtn").disabled = paused;
  }
  function snapshot() {
    capturePage();
    return {
      ...(parse(STORAGE_KEY) || {}),
      ...(typeof window.ffLocalSnapshot === "function"
        ? window.ffLocalSnapshot()
        : {}),
      schema: 1,
      pages: { ...pageState },
      directions: structuredClone(directions),
      page: currentPage,
      mode: currentMode,
      savedAt: new Date().toISOString(),
    };
  }
  function retain() {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...snapshot(),
          savedAt: null,
          draftAt: new Date().toISOString(),
        }),
      );
    } catch {
      saveState.textContent = "Not saved · export draft";
    }
  }
  function exportDraft() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot(), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "fourthform-preview-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function apply(record) {
    pageState = { ...defaultPages, ...record.pages };
    directions = structuredClone(record.directions);
    if(["Review mode","Browse mode","Edit site"].includes(record.mode)){currentMode=record.mode;qs("#modeBtn").firstChild.textContent=currentMode+" ";}
    renderDirections();
    window.dispatchEvent(new CustomEvent("fourthform:restore", { detail: record }));
    if (["Home", "Menu", "Visit"].includes(record.page))currentPage=record.page;
    // Paint the incoming page before selectPage captures it.
    renderPage(currentPage);selectPage(currentPage);
  }
  function dismiss() {
    note?.remove();
    note = null;
    paused = false;
    pendingDraft = null;
    status();
  }
  function showRecovery(record, remote = false) {
    pendingDraft = record;
    paused = true;
    status();
    note?.remove();
    note = document.createElement("section");
    note.className = "preview-recovery";
    note.setAttribute("role", "region");
    const heading = document.createElement("h2");
    heading.id = "preview-recovery-heading";
    heading.className = "sr-only";
    heading.textContent = "Review local changes";
    note.setAttribute("aria-labelledby", heading.id);
    note.append(heading);
    const text = document.createElement("p");
    text.textContent = remote
      ? "This preview was saved in another tab. Keep your current draft or load that saved version."
      : "We found unfinished work from this device. Restore it or keep your saved preview.";
    note.append(text);
    const button = (label, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "top-button";
      b.textContent = label;
      b.onclick = fn;
      note.append(b);
      return b;
    };
    const primary = button(remote ? "Keep this tab’s draft" : "Restore draft", () => {
      if (!remote) apply(record);
      localDirty = true;
      dismiss();
      retain();
    });
    button(remote ? "Load saved version" : "Keep saved version", () => {
      if (remote) {
        apply(record);
        localDirty = false;
        savedAt = record.savedAt;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      dismiss();
    });
    button("Export current draft", exportDraft);
    document.body.append(note);
    // Startup recovery is part of the current task, so put keyboard users on
    // its primary action. Cross-tab notices remain non-disruptive.
    if (!remote) primary.focus();
  }
  markDirty = function () {
    originalMarkDirty();
    retain();
    status();
  };
  saveLocal = function () {
    if (paused) return false;
    const value = snapshot();
    saveState.textContent = "Saving…";
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized)
        throw new Error("Save readback failed");
      savedAt = value.savedAt;
      localDirty = false;
      try{localStorage.removeItem(DRAFT_KEY);}catch{}
      notify("Saved on this device");
      return true;
    } catch {
      localDirty = true;
      retain();
      notify("Not saved. Export your draft or try again.");
      saveState.textContent = "Not saved";
      return false;
    }
  };
  notify = function (message) {
    originalNotify(message);
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      toast.classList.remove("show");
      status();
    }, 2200);
  };
  const saveButton = qs("#saveBtn");
  saveButton.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      saveLocal();
    },
    true,
  );
  const resetButton = qs("#resetLocalBtn");
  resetButton.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (
        !confirm(
          "Reset this preview to Mori House? Local edits and draft Directions will be removed. Export your draft first if you want to keep it.",
        )
      )
        return;
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        notify("Reset could not clear device storage. Try again.");
        return;
      }
      dismiss();
      pageState = { ...defaultPages };
      directions = structuredClone(seedDirections);
      renderDirections();
      selectPage("Home");
      localDirty = false;
      savedAt = null;
      qs("#submitBtn").textContent = "Submit revision";
      qs("#submitBtn").disabled = false;
      qsa(".popover").forEach((p) => p.classList.remove("open"));
      window.dispatchEvent(new Event("fourthform:reset"));
      notify("Local preview reset");
    },
    true,
  );
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.innerHTML =
    "<b>Export local draft</b><span>Save a copy to your device</span>";
  exportButton.onclick = exportDraft;
  qs("#projectPopover").append(exportButton);
  const draft = parse(DRAFT_KEY);
  window.ffRetainLocalDraft = retain;
  if (
    valid(draft) &&
    (!savedAt || Date.parse(draft.draftAt) > Date.parse(savedAt)) &&
    (JSON.stringify(draft.pages) !== JSON.stringify(pageState) ||
      JSON.stringify(draft.directions) !== JSON.stringify(directions) ||
      JSON.stringify(draft.initialDirection) !==
        JSON.stringify(stored?.initialDirection) ||
      JSON.stringify(draft.operations) !== JSON.stringify(stored?.operations) ||
      draft.revisionSubmitted !== stored?.revisionSubmitted ||
      draft.revisionUsed !== stored?.revisionUsed ||
      JSON.stringify(draft.revisionHistory) !== JSON.stringify(stored?.revisionHistory))
  )
    showRecovery(draft);
  else status();
  addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const incoming = JSON.parse(e.newValue);
        if (valid(incoming)) showRecovery(incoming, true);
      } catch {}
    }
  });
  addEventListener("beforeunload", (e) => {
    if (localDirty) {
      retain();
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest?.("a[href]");
      if (
        a &&
        localDirty &&
        a.target !== "_blank" &&
        !a.hasAttribute("download") &&
        !a.getAttribute("href").startsWith("#") &&
        !confirm(
          "Your preview has unsaved edits. Leave and recover them later?",
        )
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
})();
