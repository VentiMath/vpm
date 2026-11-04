import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useSize } from 'vradix-react-use-size';
const root = createRoot(document.getElementById('root'));
let size;
function Probe({ target }) { size = useSize(target); return React.createElement('output', null, JSON.stringify(size)); }
const render = target => flushSync(() => root.render(React.createElement(Probe, { target })));
const wait = async check => { for (let i = 0; i < 200; i++) { if (check()) return; await new Promise(r => setTimeout(r, 16)); } throw Error('Size did not settle: ' + JSON.stringify(size)); };
const check = (condition, message) => { if (!condition) throw Error(message); };
window.runChecks = async () => {
  const target = document.getElementById('target');
  render(target); await wait(() => size?.width === 30.5 && size.height === 40.25);
  target.style.width = '60.25px'; target.style.height = '20.5px'; await wait(() => size?.width === 60.25 && size.height === 20.5);
  // Change an inherited class after the computed-style object was retained.
  document.body.classList.add('vertical'); target.style.width = '61.25px'; target.style.height = '21.5px';
  await wait(() => size?.width === 61.25 && size.height === 21.5);
  const frame = document.createElement('iframe'); frame.srcdoc = '<div style="width:44.25px;height:55.5px"></div>';
  const loaded = new Promise(r => frame.onload = r); document.body.append(frame); await loaded;
  const view = frame.contentWindow, Native = view.ResizeObserver; let constructed = 0, disconnected = 0;
  view.ResizeObserver = class extends Native { constructor(callback) { super(callback); constructed++; } disconnect() { disconnected++; super.disconnect(); } };
  render(view.document.querySelector('div')); await wait(() => size?.width === 44.25 && size.height === 55.5);
  check(constructed === 1, 'Use the target window ResizeObserver');
  render(null); check(size === undefined, 'Null target clears measurement'); check(disconnected === 1, 'Disconnect the foreign observer');
  flushSync(() => root.unmount()); frame.remove();
  return { fractionalBorderBox: true, changedDimensions: true, liveInheritedWritingMode: true, foreignWindow: true, cleanup: true };
};
