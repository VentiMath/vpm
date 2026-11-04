import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import * as P from '@radix-ui/react-popper';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

const h = React.createElement, frame = () => new Promise(resolve => requestAnimationFrame(resolve));
const check = (ok, message) => { if (!ok) throw Error(typeof message === 'function' ? message() : message); };
const near = (a, b, message) => check(Math.abs(a - b) < 0.6, `${message}: ${a} != ${b}`);
async function until(test, message) { for (let i = 0; i < 100; i++) { if (test()) return; await frame(); } throw Error(typeof message === 'function' ? message() : message); }

window.runChecks = async variant => {
  const fixed = variant === 'vpm', host = document.getElementById('root'), root = createRoot(host);
  const observed = [];
  const OriginalObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalObserver {
    constructor(callback) { super(callback); this.targets = new Set(); observed.push(this); }
    observe(target, options) { this.targets.add(target); super.observe(target, options); }
    unobserve(target) { this.targets.delete(target); super.unobserve(target); }
    disconnect() { this.targets.clear(); super.disconnect(); }
  };
  const render = node => flushSync(() => root.render(node));
  let serial = 0; const snapshots = [];
  const external = [];
  const box = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100); };
  async function mount({ side = 'bottom', align = 'center', dir = 'ltr', arrow = true, anchorStyle = {}, contentProps = {}, scope, container } = {}) {
    let placed = 0;
    const content = h(P.Content, { ...scope, 'data-content': '', side, align, dir, sideOffset: 7, alignOffset: 5, avoidCollisions: false, onPlaced: () => placed++, style: { width: 120, height: 60, boxSizing: 'border-box' }, ...contentProps }, 'content', arrow && h(P.Arrow, { ...scope, 'data-arrow': '', width: 18, height: 8 }));
    render(h(P.Root, { ...scope, key: ++serial }, h(P.Anchor, { ...scope, 'data-anchor': '', style: { position: 'fixed', left: 260, top: 180, width: 80, height: 30, ...anchorStyle } }, 'anchor'), container ? createPortal(content, container) : content));
    await until(() => placed > 0, 'placement did not finish'); await frame(); await frame();
    const c = (container || host).querySelector('[data-content]'), wrapper = c.parentElement;
    return { c, wrapper, a: host.querySelector('[data-anchor]'), arrow: (container || host).querySelector('[data-arrow]') };
  }
  try {
    for (const dir of ['ltr', 'rtl']) for (const side of P.SIDE_OPTIONS) for (const align of P.ALIGN_OPTIONS) for (const withArrow of [false, true]) {
      const { c, a, arrow, wrapper } = await mount({ side, align, dir, arrow: withArrow });
      const reference = a.getBoundingClientRect(), content = c.getBoundingClientRect(), gap = 7 + (withArrow ? 8 : 0), vertical = side === 'top' || side === 'bottom';
      let cross = vertical ? reference.left : reference.top;
      const referenceLength = vertical ? reference.width : reference.height, contentLength = vertical ? content.width : content.height;
      const end = (align === 'end') !== (vertical && dir === 'rtl');
      if (align === 'center') cross += (referenceLength - contentLength) / 2;
      else cross += end ? referenceLength - contentLength - 5 : 5;
      const main = side === 'top' ? reference.top - content.height - gap : side === 'bottom' ? reference.bottom + gap : side === 'left' ? reference.left - content.width - gap : reference.right + gap;
      near(vertical ? content.x : content.y, cross, `${dir}/${side}/${align} alignment`); near(vertical ? content.y : content.x, main, 'main-axis offset');
      check(c.dataset.side === side && c.dataset.align === align, 'placement attributes');
      check(a.dataset.radixPopperSide === side && a.dataset.radixPopperAlign === align, 'anchor placement attributes');
      check(wrapper.style.getPropertyValue('--radix-popper-anchor-width') === '80px', 'anchor width CSS variable');
      check(wrapper.style.getPropertyValue('--radix-popper-anchor-height') === '30px', 'anchor height CSS variable');
      check(parseFloat(wrapper.style.getPropertyValue('--radix-popper-available-width')) > 0, 'available width CSS variable');
      if (arrow) {
        const r = arrow.getBoundingClientRect();
        near(side === 'top' ? r.top : side === 'bottom' ? r.bottom : side === 'left' ? r.left : r.right,
          side === 'top' ? content.bottom : side === 'bottom' ? content.top : side === 'left' ? content.right : content.left, 'arrow edge');
      }
      snapshots.push({ name: `${dir}/${side}/${align}/${withArrow}`, side: c.dataset.side, align: c.dataset.align, box: box(c), origin: wrapper.style.getPropertyValue('--radix-popper-transform-origin') });
    }
    for (const [name, options] of [
      ['flip', { anchorStyle: { top: innerHeight - 35 }, contentProps: { avoidCollisions: true, collisionPadding: 5 } }],
      ['shift', { anchorStyle: { left: 0 }, contentProps: { avoidCollisions: true, collisionPadding: { left: 14, right: 8, top: 4, bottom: 4 } } }],
    ]) {
      const { c, wrapper } = await mount(options);
      if (name === 'flip') check(c.dataset.side === 'top', 'viewport collision must flip');
      else near(c.getBoundingClientRect().left, 14, 'padding must shift');
      snapshots.push({ name, side: c.dataset.side, align: c.dataset.align, box: box(c), origin: wrapper.style.getPropertyValue('--radix-popper-transform-origin') });
    }
    const boundary = document.createElement('div'); boundary.style.cssText = 'position:fixed;left:120px;top:100px;width:220px;height:180px'; document.body.append(boundary); external.push(boundary);
    for (const sticky of ['partial', 'always']) {
      const { c, wrapper } = await mount({ anchorStyle: { left: 150, top: 240 }, contentProps: { avoidCollisions: true, collisionBoundary: [null, boundary], collisionPadding: 8, sticky } });
      check(c.dataset.side === 'top', 'explicit boundary must flip');
      snapshots.push({ name: 'boundary/' + sticky, side: c.dataset.side, align: c.dataset.align, box: box(c), origin: wrapper.style.getPropertyValue('--radix-popper-transform-origin') });
    }
    const portal = document.createElement('div'); document.body.append(portal); external.push(portal);
    const portalled = await mount({ container: portal }); check(portalled.c.closest('[data-radix-popper-content-wrapper]').parentNode === portal, 'portal content');

    const { wrapper } = await mount({ contentProps: { style: { width: 120, height: 60, zIndex: 33 } } });
    let writes = 0; const write = wrapper.style.setProperty.bind(wrapper.style);
    wrapper.style.setProperty = (name, value, priority) => { if (name.startsWith('--radix-popper-')) writes++; return write(name, value, priority); };
    for (let i = 0; i < 5; i++) { window.dispatchEvent(new Event('resize')); await frame(); await frame(); }
    check(fixed ? writes === 0 : writes >= 20, 'paired unchanged CSS write control: ' + writes);

    const clip = document.createElement('div'); clip.style.cssText = 'position:fixed;left:250px;top:200px;width:100px;height:40px;overflow:hidden'; document.body.append(clip); external.push(clip);
    let hiddenPlaced = 0;
    render(h(P.Root, { key: ++serial }, createPortal(h('div', { style: { height: 300, position: 'relative' } }, h(P.Anchor, { style: { position: 'absolute', top: 10, width: 80, height: 20 } }, 'clipped anchor')), clip), h(P.Content, { hideWhenDetached: true, onPlaced: () => hiddenPlaced++, style: { width: 120, height: 50 } }, 'hidden content')));
    await until(() => hiddenPlaced > 0, 'clipped setup'); await frame();
    clip.scrollTop = 100;
    await until(() => host.querySelector('[data-radix-popper-content-wrapper]').style.visibility === 'hidden', 'clipping ancestors should hide the detached reference');
    check(host.querySelector('[data-radix-popper-content-wrapper]').style.pointerEvents === 'none', 'hidden popup must not capture pointers');

    const useOuterScope = P.createPopperScope();
    function Scoped() {
      const scope = useOuterScope();
      return h(P.Root, scope, h(P.Anchor, { ...scope, style: { position: 'fixed', left: 100, top: 100, width: 80, height: 20 } }, 'outer'), h(P.Root, null, h(P.Anchor, { style: { position: 'fixed', left: 400, top: 300, width: 80, height: 20 } }, 'inner'), h(P.Content, { ...scope, 'data-outer': '', avoidCollisions: false, style: { width: 100, height: 40 } }, 'outer popup'), h(P.Content, { 'data-inner': '', avoidCollisions: false, style: { width: 100, height: 40 } }, 'inner popup')));
    }
    render(h(Scoped)); await until(() => host.querySelector('[data-inner]')?.parentElement.style.transform.includes('390'), 'scoped placement');
    near(host.querySelector('[data-outer]').getBoundingClientRect().top, 120, 'outer scope reference'); near(host.querySelector('[data-inner]').getBoundingClientRect().top, 320, 'inner scope reference');

    const iframe = document.createElement('iframe'); document.body.append(iframe); external.push(iframe);
    let framePlaced = 0;
    render(createPortal(h(P.Root, null, h(P.Anchor, { style: { position: 'fixed', left: 70, top: 80, width: 80, height: 30 } }, 'frame anchor'), h(P.Content, { 'data-frame-content': '', avoidCollisions: false, onPlaced: () => framePlaced++, style: { width: 100, height: 40, zIndex: 17 } }, 'frame popup', h(P.Arrow))), iframe.contentDocument.body));
    await until(() => framePlaced > 0, 'iframe placement'); await frame(); await frame();
    const inFrame = iframe.contentDocument.querySelector('[data-frame-content]');
    near(inFrame.getBoundingClientRect().left, 60, 'iframe horizontal coordinates');
    near(inFrame.getBoundingClientRect().top, 115, 'iframe arrow gap'); check(inFrame.parentElement.style.zIndex === '17', 'iframe stacking context');

    render(h(Menu.Root, { modal: false }, h(Menu.Trigger, { id: 'menu-trigger' }, 'open menu'), h(Menu.Portal, null, h(Menu.Content, { style: { width: 160 }, sideOffset: 6 }, h(Menu.Item, { id: 'first-item' }, 'First'), h(Menu.Item, null, 'Second'), h(Menu.Arrow)))));
    await frame();
    const trigger = document.getElementById('menu-trigger'); trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true }));
    await until(() => document.querySelector('[role="menu"]'), 'Dropdown keyboard open');
    // This upstream caller initially focuses the menu container in this
    // fixture. Exercise its explicit Home navigation instead of claiming that
    // opening alone placed focus on the first item.
    document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await until(() => document.activeElement?.id === 'first-item', 'Dropdown Home focuses first item');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await until(() => !document.querySelector('[role="menu"]') && document.activeElement === trigger, 'Dropdown Escape/focus return');
    render(h(Popover.Root, null, h(Popover.Trigger, { id: 'popover-trigger' }, 'open popover'), h(Popover.Portal, null, h(Popover.Content, { style: { width: 150, height: 80 } }, h('input', { 'aria-label': 'example' }), h(Popover.Arrow)))));
    const button = document.getElementById('popover-trigger'); button.click(); await until(() => document.querySelector('[role="dialog"]'), 'Popover open');
    document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await until(() => !document.querySelector('[role="dialog"]') && document.activeElement === button, 'Popover Escape/focus return');

    render(null); await frame(); await frame(); check(observed.every(observer => observer.targets.size === 0), 'ResizeObserver cleanup');
    return { snapshots, cssWrites: writes, checks: ['48 placements', 'viewport flip/shift', 'explicit boundaries', 'portals', 'clipping ancestors', 'independent scopes', 'iframe realm', 'Dropdown keyboard', 'Popover close/focus', 'observer cleanup'] };
  } finally { flushSync(() => root.unmount()); window.ResizeObserver = OriginalObserver; for (const element of external) element.remove(); }
};
