'use strict';
// Run from the clean installed consumer. Both the app and the unchanged React
// devtools must import one @tanstack/react-query entry and one React instance.
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
const from=createRequire(path.join(process.env.VPM_QUERY_CONSUMER,'package.json'));
const {JSDOM}=from('jsdom'),dom=new JSDOM('<!doctype html><body></body>',{url:'https://query.test',pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','Event','CustomEvent','localStorage','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,name,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name)?dom.window[name].bind(dom.window):dom.window[name],configurable:true});
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=from('react'),{render,act,waitFor,fireEvent,screen,cleanup}=from('@testing-library/react'),api=from('@tanstack/react-query'),{ReactQueryDevtools}=from('@tanstack/react-query-devtools');
(async()=>{
 const client=new api.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity},mutations:{gcTime:Infinity}}});let fetches=0,captured;
 function App(){captured=api.useQueryClient();const query=api.useQuery({queryKey:['release-record'],staleTime:Infinity,queryFn:async()=>++fetches});const mutation=api.useMutation({mutationFn:async()=>true,onSuccess:()=>client.invalidateQueries({queryKey:['release-record']})});return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>mutation.mutate(), 'aria-label':'Save record'},String(query.data)),React.createElement(ReactQueryDevtools,{initialIsOpen:true}));}
 try{
  render(React.createElement(api.QueryClientProvider,{client},React.createElement(App)));await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Save record'}).textContent,'1'));assert.equal(captured,client);await waitFor(()=>assert(screen.getByText('["release-record"]')));
  fireEvent.click(screen.getByText('["release-record"]'));await waitFor(()=>assert(screen.getByText('Query Details')));fireEvent.click(screen.getByRole('button',{name:'Invalidate'}));await waitFor(()=>assert.equal(client.getQueryData(['release-record']),2));
  fireEvent.click(screen.getByRole('button',{name:'Save record'}));await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Save record'}).textContent,'3'));assert.equal(fetches,3);
  cleanup();
  console.log(await require('./first-render.cjs')(React, api, from('@testing-library/react')), 'first committed installed-query states checked');
  await require('./transitions.cjs')(React, api, from('@testing-library/react'));
  console.log('Installed app and unchanged React Devtools share one provider: query load, invalidation, mutation refresh, scheduled notifications and async transition retries pass.');
 }finally{await act(async()=>cleanup());client.clear();dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
