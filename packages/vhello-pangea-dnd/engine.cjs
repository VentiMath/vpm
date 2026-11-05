'use strict';
// One owner per document; no global event handlers or singleton board state.
const owners = new WeakMap();
const same = (a, b) => a === b || !!a && !!b && a.droppableId === b.droppableId && a.index === b.index;
const point = e => ({ x: e.clientX, y: e.clientY });
const contains = (r, p) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
const number = value => Number.parseFloat(value) || 0;
function rect(node) {
  const r = node.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}
function baseRect(node) {
  const r = rect(node), style = node.ownerDocument.defaultView.getComputedStyle(node);
  const matrix = style.transform === 'none' ? null : new node.ownerDocument.defaultView.DOMMatrixReadOnly(style.transform);
  if (matrix) { r.left -= matrix.m41; r.right -= matrix.m41; r.top -= matrix.m42; r.bottom -= matrix.m42; }
  return r;
}
function visibleRect(node) {
  const r = rect(node), win = node.ownerDocument.defaultView;
  r.left = Math.max(0, r.left); r.top = Math.max(0, r.top);
  r.right = Math.min(win.innerWidth, r.right); r.bottom = Math.min(win.innerHeight, r.bottom);
  for (let p = node.parentElement; p; p = p.parentElement) {
    const s = win.getComputedStyle(p), box = rect(p);
    if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { r.left = Math.max(r.left, box.left); r.right = Math.min(r.right, box.right); }
    if (/(auto|scroll|hidden|clip)/.test(s.overflowY)) { r.top = Math.max(r.top, box.top); r.bottom = Math.min(r.bottom, box.bottom); }
  }
  return r;
}
function createStore(id) {
  const idle = { drag: null, offsets: new Map(), announcement: '', revision: 0 };
  let state = idle, drag = null, pending = null, frame = null, cleanup = [], clickCleanup = null;
  const listeners = new Set(), items = new Map(), drops = new Map();
  const store = {
    id, items, drops, props: {},
    getSnapshot: () => state, getServerSnapshot: () => idle,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    announce: text => { state = { ...state, announcement: String(text), revision: state.revision + 1 }; emit(); },
    register(map, record, node) {
      if (node) {
        const prior = map.get(record.id);
        if (prior && prior !== record) throw Error('Duplicate drag-and-drop ID: ' + record.id);
        record.node = node; map.set(record.id, record);
      } else if (map.get(record.id) === record) {
        map.delete(record.id); record.node = null;
        if (drag && (drag.item === record || drag.source.droppableId === record.id && map === drops)) finish('CANCEL');
      }
    },
    mouse: (event, item) => prepare(event, item, false),
    touch: (event, item) => prepare(event, item, true),
    key(event, item) {
      if (event.key !== ' ' || event.defaultPrevented || drag || pending || !allowed(event, item)) return;
      event.preventDefault(); event.stopPropagation();
      const r = rect(item.node); lift(item, 'SNAP', { x: r.left + r.width / 2, y: r.top + r.height / 2 }, event.currentTarget);
    },
    destroy() { finish('CANCEL', false); clear(); clickCleanup?.(); },
  };
  function emit() { for (const fn of [...listeners]) fn(); }
  function members(dropId) {
    return [...items.values()].filter(x => x.dropId === dropId && x.node?.isConnected && x !== drag?.item).sort((a, b) => a.props.index - b.props.index);
  }
  function bind(node, type, fn, options) {
    node.addEventListener(type, fn, options); cleanup.push(() => node.removeEventListener(type, fn, options));
  }
  function clear() {
    if (pending?.timer) pending.win.clearTimeout(pending.timer);
    pending = null;
    if (frame) { frame.win.cancelAnimationFrame(frame.id); frame = null; }
    for (const fn of cleanup.splice(0)) fn();
  }
  function allowed(event, item) {
    if (store.props.enableDefaultSensors === false || item.props.isDragDisabled || !item.node?.isConnected) return false;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const nearest = target?.closest('[data-rfd-draggable-id]');
    if (nearest?.getAttribute('data-rfd-draggable-context-id') === id && items.get(nearest.getAttribute('data-rfd-draggable-id'))?.props.isDragDisabled) return false;
    const handle = target?.closest('[data-rfd-drag-handle-context-id]');
    if (!handle || handle.getAttribute('data-rfd-drag-handle-context-id') !== id || handle.getAttribute('data-rfd-drag-handle-draggable-id') !== item.id) return false;
    const interactive = target.closest('input,button,textarea,select,option,video,audio,[contenteditable=""],[contenteditable="true"]');
    return !interactive || interactive === handle || !handle.contains(interactive) || item.props.disableInteractiveElementBlocking;
  }
  function prepare(event, item, touch) {
    if (event.defaultPrevented || drag || pending || !allowed(event, item)) return;
    if (!touch && (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (touch && event.touches.length !== 1) return;
    const doc = item.node.ownerDocument, win = doc.defaultView;
    if (owners.has(doc)) return;
    const first = touch ? event.touches[0] : event;
    pending = { item, start: point(first), handle: event.currentTarget, win, touchId: first.identifier };
    const move = e => {
      const p = pending;
      const contact = touch ? [...e.touches].find(t => t.identifier === (p?.touchId ?? drag?.touchId)) : e;
      if (touch && e.touches.length !== 1) { finish('CANCEL'); clear(); return; }
      if (!contact) return;
      if (p) {
        if (Math.max(Math.abs(contact.clientX - p.start.x), Math.abs(contact.clientY - p.start.y)) < 5) return;
        if (touch) { clear(); return; } // Before long press, let the browser scroll.
        lift(item, 'FLUID', p.start, p.handle);
      }
      if (drag) { e.preventDefault(); drag.point = point(contact); schedule(); }
    };
    bind(win, touch ? 'touchmove' : 'mousemove', move, { capture: true, passive: false });
    bind(win, touch ? 'touchend' : 'mouseup', e => {
      if (drag) { if (touch) e.preventDefault(); else drag.point = point(e); updatePointer(); finish('DROP'); } else clear();
    }, { capture: true, passive: false });
    bind(win, 'touchcancel', () => { finish('CANCEL'); clear(); }, true);
    bind(win, 'blur', () => { finish('CANCEL'); clear(); });
    if (touch) pending.timer = win.setTimeout(() => {
      if (!pending) return;
      const p = pending; lift(item, 'FLUID', p.start, p.handle, p.touchId);
    }, 120);
  }
  function lift(item, mode, start, handle, touchId) {
    const sourceDrop = drops.get(item.dropId), doc = item.node?.ownerDocument;
    if (!sourceDrop?.node || !doc || owners.has(doc)) { clear(); return; }
    if (pending?.timer) pending.win.clearTimeout(pending.timer);
    if (frame) { frame.win.cancelAnimationFrame(frame.id); frame = null; }
    pending = null; owners.set(doc, store);
    const source = { droppableId: item.dropId, index: item.props.index };
    const startData = { draggableId: item.id, type: sourceDrop.props.type || 'DEFAULT', source, mode };
    try {
      store.props.onBeforeCapture?.({ draggableId: item.id, mode });
      store.props.onBeforeDragStart?.(startData);
      const box = rect(item.node), css = doc.defaultView.getComputedStyle(item.node);
      drag = { ...startData, item, doc, win: doc.defaultView, handle, touchId, point: start, start, box,
        margins: { top: number(css.marginTop), right: number(css.marginRight), bottom: number(css.marginBottom), left: number(css.marginLeft) },
        destination: source, offsets: new Map() };
      handle.focus({ preventScroll: true });
      bind(doc, 'keydown', keyboard, true);
      bind(doc, 'selectstart', event => event.preventDefault(), true);
      bind(doc, 'visibilitychange', () => { if (doc.hidden) finish('CANCEL'); });
      bind(doc.defaultView, 'resize', () => finish('CANCEL'));
      if (mode === 'SNAP') bind(doc.defaultView, 'blur', () => finish('CANCEL'));
      bind(doc, 'scroll', () => { if (drag?.mode === 'FLUID') schedule(); }, true);
      publish('Lifted item at position ' + (source.index + 1) + '.');
      store.props.onDragStart?.(startData, { announce: store.announce });
      if (mode === 'FLUID') schedule();
    } catch (error) { const current = drag; drag = null; owners.delete(doc); clear(); if (current) publish(); throw error; }
  }
  function publish(announcement = state.announcement) {
    const offsets = new Map();
    if (drag?.destination) {
      const dest = drops.get(drag.destination.droppableId);
      if (dest?.node) {
        const horizontal = dest.props.direction === 'horizontal', css = drag.win.getComputedStyle(dest.node);
        const amount = horizontal ? drag.box.width + drag.margins.left + drag.margins.right + number(css.columnGap)
          : drag.box.height + drag.margins.top + drag.margins.bottom + number(css.rowGap);
        members(dest.id).forEach((item, i) => { if (i >= drag.destination.index) offsets.set(item.id, horizontal ? { x: amount, y: 0 } : { x: 0, y: amount }); });
      }
    }
    state = { drag: drag ? { ...drag } : null, offsets, announcement, revision: state.revision + 1 }; emit();
  }
  function updateDestination(destination) {
    if (!drag) return;
    const changed = !same(drag.destination, destination);
    drag.destination = destination; publish(changed ? destination ? 'Moving to position ' + (destination.index + 1) + (destination.droppableId === drag.source.droppableId ? ' in the same list.' : ' in another list.') : 'Outside a drop target.' : undefined);
    if (changed) {
      try { store.props.onDragUpdate?.({ draggableId: drag.draggableId, type: drag.type, source: drag.source, mode: drag.mode, destination, combine: null }, { announce: store.announce }); }
      catch (error) { finish('CANCEL', false); throw error; }
    }
  }
  function updatePointer() {
    if (!drag) return;
    if (!drag.item.node?.isConnected || drag.item.props.isDragDisabled) { finish('CANCEL'); return; }
    const candidates = [...drops.values()].filter(d => d.node?.isConnected && !d.props.isDropDisabled && (d.props.type || 'DEFAULT') === drag.type && contains(visibleRect(d.node), drag.point));
    // Prefer the deepest eligible target; nested lists of another type never win.
    candidates.sort((a, b) => a.node.contains(b.node) ? 1 : b.node.contains(a.node) ? -1 : 0);
    const dest = candidates[0];
    if (!dest) { updateDestination(null); return; }
    const horizontal = dest.props.direction === 'horizontal';
    const peers = members(dest.id);
    const position = horizontal ? drag.point.x + drag.box.width / 2 - (drag.start.x - drag.box.left)
      : drag.point.y + drag.box.height / 2 - (drag.start.y - drag.box.top);
    // Removing the fixed item closes its old slot in normal flow. Restore that
    // slot for source hit-testing, so merely crossing the lift threshold cannot
    // reorder a card grabbed in its center. Preview transforms are excluded too.
    const css = drag.win.getComputedStyle(dest.node);
    const oldSlot = horizontal ? drag.box.width + drag.margins.left + drag.margins.right + number(css.columnGap)
      : drag.box.height + drag.margins.top + drag.margins.bottom + number(css.rowGap);
    const sourceIsFixed = dest.id === drag.source.droppableId && drag.win.getComputedStyle(drag.item.node).position === 'fixed';
    const index = peers.findIndex(item => {
      const r = baseRect(item.node);
      const restored = sourceIsFixed && item.props.index > drag.source.index ? oldSlot : 0;
      return position <= (horizontal ? r.left + r.width / 2 : r.top + r.height / 2) + restored;
    });
    updateDestination({ droppableId: dest.id, index: index < 0 ? peers.length : index });
  }
  function schedule() {
    if (!drag || frame) return;
    const win = drag.win;
    frame = { win, id: win.requestAnimationFrame(() => {
      frame = null;
      if (!drag) return;
      updatePointer();
      if (drag && autoScroll()) schedule();
    }) };
  }
  function autoScroll() {
    if (store.props.autoScrollerOptions?.disabled) return false;
    const p = drag.point, win = drag.win, targets = [];
    const dest = drag.destination && drops.get(drag.destination.droppableId);
    for (let node = dest?.node || drag.item.node?.parentElement; node; node = node.parentElement) targets.push(node);
    const scrolling = drag.doc.scrollingElement;
    if (scrolling && !targets.includes(scrolling)) targets.push(scrolling);
    let moved = false, usedX = false, usedY = false;
    for (const node of targets) {
      const isPage = node === scrolling, s = win.getComputedStyle(node);
      const r = isPage ? { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight } : rect(node);
      const speed = (value, min, max) => { const edge = Math.min(40, (max - min) / 4); return value < min + edge ? -Math.ceil(16 * Math.min(1, (min + edge - value) / edge)) : value > max - edge ? Math.ceil(16 * Math.min(1, (value - max + edge) / edge)) : 0; };
      const x = node.scrollLeft, y = node.scrollTop;
      if (!usedX && (isPage || /(auto|scroll)/.test(s.overflowX))) node.scrollLeft += speed(p.x, r.left, r.right);
      if (!usedY && (isPage || /(auto|scroll)/.test(s.overflowY))) node.scrollTop += speed(p.y, r.top, r.bottom);
      if (node.scrollLeft !== x) { usedX = true; moved = true; }
      if (node.scrollTop !== y) { usedY = true; moved = true; }
    }
    return moved;
  }
  function keyboard(event) {
    if (!drag) return;
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); finish('CANCEL'); return; }
    if (drag.mode !== 'SNAP') return;
    if (event.key === ' ') { event.preventDefault(); finish('DROP'); return; }
    if (!/^Arrow(Left|Right|Up|Down)$/.test(event.key)) return;
    event.preventDefault();
    const dest = drops.get(drag.destination?.droppableId || drag.source.droppableId);
    if (!dest) return;
    const horizontal = dest.props.direction === 'horizontal';
    const forward = event.key === (horizontal ? 'ArrowRight' : 'ArrowDown'), backward = event.key === (horizontal ? 'ArrowLeft' : 'ArrowUp');
    let target = dest, index = drag.destination?.index || 0;
    if (forward || backward) index = Math.max(0, Math.min(members(dest.id).length, index + (forward ? 1 : -1)));
    else {
      const current = rect(dest.node), direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const cross = r => horizontal ? r.top + r.height / 2 : r.left + r.width / 2;
      const candidates = [...drops.values()].filter(d => d !== dest && d.node?.isConnected && !d.props.isDropDisabled && (d.props.type || 'DEFAULT') === drag.type)
        .map(d => ({ d, distance: (cross(rect(d.node)) - cross(current)) * direction })).filter(x => x.distance > 0).sort((a, b) => a.distance - b.distance);
      if (!candidates.length) return;
      target = candidates[0].d; index = Math.min(index, members(target.id).length);
    }
    updateDestination({ droppableId: target.id, index });
    const peers = members(target.id), node = peers[Math.min(index, peers.length - 1)]?.node || target.node;
    node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const r = baseRect(node), end = index >= peers.length && peers.length > 0;
    drag.point = { x: r.left + drag.box.width / 2 + (horizontal && end ? r.width : 0), y: r.top + drag.box.height / 2 + (!horizontal && end ? r.height : 0) };
    publish();
  }
  function finish(reason, notify = true) {
    if (!drag) { clear(); return; }
    const ended = drag; drag = null; owners.delete(ended.doc); clear();
    const destination = reason === 'DROP' && ended.destination && !drops.get(ended.destination.droppableId)?.props.isDropDisabled ? ended.destination : null;
    publish(reason === 'DROP' && destination ? 'Dropped at position ' + (destination.index + 1) + '.' : 'Drag canceled.');
    if (ended.mode === 'FLUID') {
      clickCleanup?.();
      const block = e => { e.preventDefault(); e.stopImmediatePropagation(); remove(); };
      const timer = ended.win.setTimeout(remove, 400);
      function remove() { ended.doc.removeEventListener('click', block, true); ended.win.clearTimeout(timer); if (clickCleanup === remove) clickCleanup = null; }
      clickCleanup = remove; ended.doc.addEventListener('click', block, true);
    }
    try {
      if (notify) store.props.onDragEnd?.({ draggableId: ended.draggableId, type: ended.type, source: ended.source, mode: ended.mode, destination, combine: null, reason }, { announce: store.announce });
    } finally {
      if (notify) {
        const win = ended.win;
        const id = win.requestAnimationFrame(() => {
          frame = null;
          const record = items.get(ended.draggableId);
          const handles = record?.node?.querySelectorAll('[data-rfd-drag-handle-context-id]');
          const handle = record?.node?.hasAttribute('data-rfd-drag-handle-context-id') ? record.node : handles?.[0];
          if (handle?.isConnected && (!owners.has(ended.doc))) handle.focus({ preventScroll: true });
        });
        frame = { win, id };
      }
    }
  }
  return store;
}
module.exports = { createStore };
