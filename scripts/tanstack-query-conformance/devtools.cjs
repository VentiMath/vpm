'use strict';
// Exercise VentiMath's pinned developer UI with the public cache interface.
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="tools"></div></body></html>', {url: 'https://query.test/', pretendToBeVisual: true});
for (const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','Event','CustomEvent','localStorage','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) Object.defineProperty(globalThis, name, {value: typeof dom.window[name] === 'function' && ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name], configurable: true});
window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
globalThis.ResizeObserver = class {observe() {} unobserve() {} disconnect() {}};
const {waitFor, fireEvent, getByText, getByRole} = require('@testing-library/dom');
(async () => {
  const core = process.argv.includes('--upstream') ? await import('@tanstack/query-core') : await import('../../packages/vtanstack-query-core/query-client.js');
  const {TanstackQueryDevtools} = await import('@tanstack/query-devtools');
  const client = new core.QueryClient({defaultOptions: {queries: {gcTime: Infinity}}});
  let fetches = 0;
  const observer = new core.QueryObserver(client, {queryKey: ['devtools-record'], queryFn: async () => ({title: 'record', revision: ++fetches}), staleTime: Infinity});
  const errors = []; window.addEventListener('error', event => errors.push(event.error));
  const stop = observer.subscribe(() => {}); await observer.refetch({cancelRefetch: false});
  const target = document.getElementById('tools');
  const tools = new TanstackQueryDevtools({client, onlineManager: core.onlineManager, queryFlavor: 'React Query', version: '5', initialIsOpen: true});
  try {
    tools.mount(target);
    await waitFor(() => assert.ok(target.textContent.includes('devtools-record')));
    fireEvent.click(getByText(target, '["devtools-record"]'));
    await waitFor(() => assert.ok(target.textContent.includes('Query Details')));
    fireEvent.click(getByRole(target, 'button', {name: 'Invalidate'}));
    await waitFor(() => assert.equal(client.getQueryData(['devtools-record']).revision, 2));
    assert.equal(client.getQueryState(['devtools-record']).isInvalidated, false);
    assert.deepEqual(errors, []);
    assert.equal(client.getQueryData(['devtools-record']).title, 'record');
    console.log(`${process.argv.includes('--upstream') ? 'Upstream' : 'VPM'}: developer tools show query details and invalidate an active query.`);
  } finally {tools.unmount(); stop(); client.clear(); dom.window.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
