'use client';
'use strict';
const React = require('react');
const { useLayoutEffect } = require('vradix-react-use-layout-effect');

// Decode CSS animation-name lists, including quoted names and escaped commas.
// AnimationEvent.animationName is decoded, so substring matching is incorrect.
function names(text = '', keepNone = false) {
  const result = []; let value = '', quote = '', quoted = false;
  const push = () => { if (value && (value !== 'none' || quoted)) result.push(value); else if (value && keepNone) result.push(null); value = ''; quoted = false; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      const hex = /^[\da-f]{1,6}/i.exec(text.slice(i + 1));
      if (hex) {
        const n = Number.parseInt(hex[0], 16); value += String.fromCodePoint(!n || n > 0x10ffff || n >= 0xd800 && n <= 0xdfff ? 0xfffd : n);
        i += hex[0].length; if (/\s/.test(text[i + 1] || '')) i++;
      } else if (i + 1 < text.length) value += text[++i];
    } else if (quote) { if (char === quote) quote = ''; else value += char; }
    else if (char === '"' || char === "'") { quote = char; quoted = true; }
    else if (char === ',') push();
    else if (!/\s/.test(char)) value += char;
  }
  push(); return result;
}
function styles(node) { return node?.ownerDocument.defaultView?.getComputedStyle(node); }
function restore(record) {
  if (!record?.fill) return;
  const style = record.node.style, saved = record.fill; record.fill = null;
  if (style.getPropertyValue('animation-fill-mode') === 'forwards' && !style.getPropertyPriority('animation-fill-mode')) {
    if (saved.value) style.setProperty('animation-fill-mode', saved.value, saved.priority);
    else style.removeProperty('animation-fill-mode');
  }
}
function detach(record) {
  if (!record) return;
  record.generation++; record.pending = null; restore(record);
  for (const type of ['animationstart', 'animationend', 'animationcancel']) record.node.removeEventListener(type, record.event);
}
function fallbackNames(style) {
  const all = names(style.animationName, true), durations = (style.animationDuration || '0s').split(',');
  const delays = (style.animationDelay || '0s').split(','), iterations = (style.animationIterationCount || '1').split(',');
  const seconds = value => (Number.parseFloat(value) || 0) / (value.trim().endsWith('ms') ? 1000 : 1);
  return all.filter((name, i) => {
    if (!name) return false;
    const count = Number(iterations[i % iterations.length]);
    return Number.isFinite(count) && count > 0 && seconds(durations[i % durations.length]) * count + seconds(delays[i % delays.length]) > 0;
  });
}
function Presence({ present, children }) {
  const [kept, keep] = React.useState(present), [node, setNode] = React.useState(null);
  const control = React.useRef({ present, record: null });
  const child = typeof children === 'function' ? children({ present: present || kept }) : React.Children.only(children);
  const childRef = child.props.ref;
  const ref = React.useCallback(element => {
    if (!element) return;
    setNode(element);
    let cleanup;
    if (typeof childRef === 'function') cleanup = childRef(element);
    else if (childRef) childRef.current = element;
    return () => {
      setNode(current => current === element ? null : current);
      if (typeof cleanup === 'function') cleanup();
      else if (typeof childRef === 'function') childRef(null);
      else if (childRef?.current === element) childRef.current = null;
    };
  }, [childRef]);

  useLayoutEffect(() => () => {
    detach(control.current.record); control.current.record = null;
  }, []);
  useLayoutEffect(() => {
    const c = control.current, previous = c.record;
    const changed = c.present !== present, replacingExit = previous?.pending && previous.node !== node;
    c.present = present;
    if (previous?.node !== node) { detach(previous); c.record = null; }
    if (!node) { if (!present) keep(false); return; }
    if (!c.record) {
      const style = styles(node);
      // CSSOM returns a live declaration. Keep it with its owning element instead
      // of requesting another computed-style object on each presence change.
      const record = { node, style, openName: style?.animationName || 'none', generation: 0, pending: null, native: false, fill: null };
      const finish = generation => {
        if (c.record !== record || record.generation !== generation || c.present || !record.pending) return;
        record.pending = null;
        record.fill = { value: node.style.getPropertyValue('animation-fill-mode'), priority: node.style.getPropertyPriority('animation-fill-mode') };
        node.style.setProperty('animation-fill-mode', 'forwards');
        keep(false);
      };
      record.finish = finish;
      record.event = event => {
        if (event.target !== node || event.pseudoElement) return;
        if (event.type === 'animationstart') { if (c.present) record.openName = record.style?.animationName || 'none'; return; }
        if (!record.pending || record.native || c.present) return;
        const count = record.pending.get(event.animationName);
        if (!count) return;
        if (count === 1) record.pending.delete(event.animationName); else record.pending.set(event.animationName, count - 1);
        if (!record.pending.size) finish(record.generation);
      };
      for (const type of ['animationstart', 'animationend', 'animationcancel']) node.addEventListener(type, record.event);
      c.record = record;
    }
    const record = c.record;
    if (!kept) restore(record);
    if (present) {
      if (changed || record.pending) {
        record.generation++; record.pending = null; restore(record);
        record.openName = record.style?.animationName || 'none';
      }
      keep(true); return;
    }
    if (!changed && !replacingExit) return;
    const style = record.style, currentName = style?.animationName || 'none';
    record.generation++; record.pending = null; restore(record);
    if (!style || style.display === 'none' || !names(currentName).length || !replacingExit && currentName === record.openName) { keep(false); return; }
    const generation = record.generation;
    // Native animation identities prevent stale end events, and include every
    // finite animation on this element. Descendants, pseudo-elements, transitions
    // and infinite decorative animations are not exit blockers.
    if (typeof node.getAnimations === 'function') {
      const active = () => node.getAnimations().filter(animation => typeof animation.animationName === 'string' &&
        animation.effect?.target === node && !animation.effect.pseudoElement &&
        animation.playState !== 'finished' && animation.playState !== 'idle' &&
        Number.isFinite(animation.effect.getComputedTiming().endTime));
      const animations = active();
      record.native = true;
      if (!animations.length) { keep(false); return; }
      record.pending = new Map();
      const wait = animations => Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (c.record !== record || record.generation !== generation || c.present || !record.pending) return;
        // A class/style change can cancel an exit and start its replacement
        // while present remains false. Follow the new identities before hiding.
        const remaining = active();
        if (remaining.length) wait(remaining);
        else record.finish(generation);
      });
      wait(animations);
    } else {
      record.native = false; record.pending = new Map();
      for (const name of fallbackNames(style)) record.pending.set(name, (record.pending.get(name) || 0) + 1);
      if (!record.pending.size) { record.pending = null; keep(false); }
    }
  }, [node, present, kept]);
  return typeof children === 'function' || present || kept ? React.cloneElement(child, { ref }) : null;
}
module.exports = { Presence, Root: Presence };
