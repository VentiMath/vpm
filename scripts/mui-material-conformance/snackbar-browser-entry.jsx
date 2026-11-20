import React from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Notice, HydrationScene} from './snackbar-scene.jsx';
const host = document.getElementById('hydration');
if (host) {
  window.beforeHydration = host.querySelector('[role=alert]');
  hydrateRoot(host, <HydrationScene />, {onRecoverableError:e => {throw e;}});
  window.hydrationReady = true;
} else {
  // Keep the two-second clipboard timer under deterministic control. React's
  // transition tasks, clicks and effects still run on the browser event loop.
  const timers = new Map();
  const schedule = window.setTimeout.bind(window);
  const cancel = window.clearTimeout.bind(window);
  let next = -1;
  window.setTimeout = (fn, ms, ...args) => {
    if (![2000,1000,700].includes(ms)) return schedule(fn,ms,...args);
    timers.set(--next, {ms,fn}); return next;
  };
  window.clearTimeout = id => { if (!timers.delete(id)) cancel(id); };
  window.clock = () => [...timers].map(([id,{ms}]) => [id,ms]);
  window.fire = id => { const t = timers.get(id); timers.delete(id); t.fn(); };
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  window.reasons = [];
  const draw = (options = {}) => flushSync(() => root.render(<React.StrictMode>
    <button id="copy" onClick={() => draw()}>Copy link</button>
    <Notice transitionDuration={0} action onClose={(event,reason) => {
      window.reasons.push(reason);
      draw({open:false});
    }} {...options}/>
  </React.StrictMode>));
  window.draw = draw;
  window.unmountNotice = () => flushSync(() => root.unmount());
  draw({open:false});
}
