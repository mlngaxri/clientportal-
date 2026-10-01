/* Review deployments only. data-parent-origin must be the exact Fourthform origin. */
(() => {
  const origin = document.currentScript?.dataset.parentOrigin;
  if (!origin || window.parent === window) return;
  try { if (new URL(origin).origin !== origin || !/^https?:/.test(origin)) return; } catch { return; }
  let enabled = false, target = null, previousOutline = '', pins = [];
  const overlay = document.createElement('div');
  overlay.setAttribute('data-fourthform-tools', '');
  Object.assign(overlay.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483646' });
  document.documentElement.appendChild(overlay);
  function selector(el) {
    if (el.dataset.fourthformId) return `[data-fourthform-id="${CSS.escape(el.dataset.fourthformId)}"]`;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const siblings = [...(node.parentElement?.children || [])].filter(s => s.tagName === node.tagName);
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
    }
    return parts.join(' > ');
  }
  function context(el) {
    const r = el.getBoundingClientRect();
    return { page: location.pathname + location.search, width: innerWidth, scroll: scrollY, selector: selector(el), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
  }
  function clearTarget() { if (target) target.style.outline = previousOutline; target = null; }
  function renderPins() {
    overlay.replaceChildren();
    const missing = [];
    for (const pin of pins) {
      if (pin.target?.page !== location.pathname + location.search) continue;
      let el;
      try { el = pin.target.selector && document.querySelector(pin.target.selector); } catch {}
      if (!el) { missing.push(pin.id); continue; }
      const r = el.getBoundingClientRect();
      const button = document.createElement('button');
      button.textContent = String(pin.number); button.setAttribute('aria-label', `Direction ${pin.number}`);
      Object.assign(button.style, { position: 'absolute', left: `${Math.max(0, r.left)}px`, top: `${r.top}px`, width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #FAF9F5', color: 'white', background: '#665CF6', pointerEvents: 'auto', cursor: 'pointer' });
      button.addEventListener('click', () => parent.postMessage({ type: 'ff-pin', id: pin.id }, origin));
      overlay.appendChild(button);
    }
    parent.postMessage({ type: 'ff-unresolved', ids: missing }, origin);
  }
  addEventListener('message', e => {
    if (e.origin !== origin || e.source !== parent) return;
    if (e.data?.type === 'ff-mode') { enabled = e.data.enabled === true; clearTarget(); renderPins(); parent.postMessage({ type: 'ff-state', enabled }, origin); }
    if (e.data?.type === 'ff-pins' && Array.isArray(e.data.pins)) { pins = e.data.pins.slice(0, 500).filter(p => p && typeof p.id === 'string' && Number.isInteger(p.number)); renderPins(); }
    if (e.data?.type === 'ff-focus' && typeof e.data.selector === 'string' && e.data.selector.length < 2001 && e.data.page === location.pathname + location.search) {
      try { document.querySelector(e.data.selector)?.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch {}
    }
  });
  document.addEventListener('click', e => {
    if (!enabled || !(e.target instanceof Element) || e.target.closest('[data-fourthform-tools]')) return;
    e.preventDefault(); e.stopPropagation();
    parent.postMessage({ type: 'ff-target', context: context(e.target), label: e.target.getAttribute('alt') || e.target.textContent?.trim().slice(0, 90) || e.target.tagName }, origin);
  }, true);
  document.addEventListener('dragover', e => {
    if (!enabled || !(e.target instanceof HTMLImageElement)) { clearTarget(); return; }
    e.preventDefault(); if (target !== e.target) { clearTarget(); target = e.target; previousOutline = target.style.outline; target.style.outline = '2px solid #665CF6'; }
  });
  document.addEventListener('dragleave', clearTarget);
  document.addEventListener('drop', e => {
    if (enabled && e.target instanceof HTMLImageElement) {
      e.preventDefault(); const file = e.dataTransfer?.files[0];
      if (file?.type.startsWith('image/')) parent.postMessage({ type: 'ff-replace', context: context(e.target), file, label: e.target.alt || 'image' }, origin);
    }
    clearTarget();
  });
  let scheduled = false;
  const redraw = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; renderPins(); }); };
  addEventListener('scroll', redraw, true); addEventListener('resize', redraw);
  parent.postMessage({ type: 'ff-ready' }, origin);
})();
