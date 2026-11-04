import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { renderToString } from 'react-dom/server';
import { Arrow } from '@radix-ui/react-arrow';
import * as Popper from '@radix-ui/react-popper';

const h = React.createElement;
const check = (value, message) => { if (!value) throw Error(message); };
const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
async function until(test, message) { for (let i = 0; i < 100; i++) { if (test()) return; await frame(); } throw Error(message); }

window.runChecks = async () => {
  const host = document.getElementById('root'); let root = createRoot(host);
  const render = tree => flushSync(() => root.render(tree));
  const reference = React.createRef();
  try {
    render(h(Arrow, { ref: reference, width: 30, height: 10, tabIndex: 0, style: { display: 'block', color: 'rgb(10, 20, 30)', fill: 'currentColor' } }));
    const svg = reference.current, polygon = svg.firstChild, box = polygon.getBBox();
    check(box.x === 0 && box.y === 0 && box.width === 30 && box.height === 10, 'native triangle geometry');
    check(svg.getBoundingClientRect().width === 30 && getComputedStyle(polygon).fill === 'rgb(10, 20, 30)', 'native sizing and inherited color');
    svg.focus(); render(h(Arrow, { ref: reference, width: 40, height: 20, tabIndex: 0 }));
    check(reference.current === svg && svg.firstChild === polygon && document.activeElement === svg, 'DOM identity and focus through updates');

    let outer = null, inner = null, attached = 0, detached = 0; const events = [];
    const outerRef = element => { outer = element; attached++; return () => { outer = null; detached++; }; };
    const innerRef = element => { inner = element; return () => { inner = null; }; };
    const custom = h(Arrow, { asChild: true, ref: outerRef, className: 'outer', onClick: () => events.push('outer') }, h('svg', { ref: innerRef, className: 'inner', width: 50, viewBox: '0 0 50 10', onClick: () => events.push('inner') }, h('path', { d: 'M0 0L50 0L25 10Z' })));
    render(custom); check(outer === inner && outer === host.firstChild, 'slot refs and no extra wrapper');
    check(outer.getAttribute('width') === '50' && outer.firstChild.tagName === 'path', 'custom geometry'); outer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check(events.join(',') === 'inner,outer', 'composed events'); render(null); check(!outer && !inner && attached === detached, 'callback ref cleanup');

    const placements = [];
    for (const dir of ['ltr', 'rtl']) for (const side of ['top', 'right', 'bottom', 'left']) {
      host.dir = dir;
      render(h(Popper.Root, { key: side + dir }, h(Popper.Anchor, { style: { position: 'fixed', top: 200, left: 250, width: 80, height: 30 } }, 'anchor'), h(Popper.Content, { side, align: 'center', avoidCollisions: false, style: { width: 100, height: 50 } }, h(Popper.Arrow, { ref: reference, 'data-arrow': '', width: 18, height: 8 }))));
      await until(() => {
        const content = host.querySelector('[data-side]');
        return content?.dataset.side === side && !content.style.animation;
      }, 'Popper did not place ' + side);
      await frame();
      const content = host.querySelector('[data-side]'), arrow = host.querySelector('[data-arrow]');
      check(arrow === reference.current && arrow.firstChild.tagName === 'polygon', 'Popper ref and geometry');
      const c = content.getBoundingClientRect(), a = arrow.getBoundingClientRect();
      const difference = side === 'bottom' ? Math.abs(a.bottom - c.top) : side === 'top' ? Math.abs(a.top - c.bottom) : side === 'left' ? Math.abs(a.left - c.right) : Math.abs(a.right - c.left);
      check(difference < 0.1, 'arrow meets content edge: ' + side + ' ' + difference);
      const center = side === 'top' || side === 'bottom' ? Math.abs((a.left + a.right) / 2 - (c.left + c.right) / 2) : Math.abs((a.top + a.bottom) / 2 - (c.top + c.bottom) / 2);
      check(center < 0.1 && a.width > 0 && a.height > 0 && getComputedStyle(arrow.parentElement).visibility !== 'hidden', 'centered visible arrow: ' + side);
      placements.push(dir + ':' + side);
    }
    flushSync(() => root.unmount());
    const tree = h(Arrow, { ref: reference, width: 24, height: 12 }); host.innerHTML = renderToString(tree); const before = host.firstChild, errors = [];
    root = hydrateRoot(host, tree, { onRecoverableError: e => errors.push(e) });
    await until(() => reference.current === before, 'hydration failed'); check(errors.length === 0, 'hydration mismatch');
    return { geometry: true, focusAndIdentity: true, customSlot: true, refCleanup: true, placements, hydration: true };
  } finally { flushSync(() => root.unmount()); }
};
