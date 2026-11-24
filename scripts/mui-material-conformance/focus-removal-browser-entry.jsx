import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import Dialog from '@dialog';
import TrapFocus from '@trap';
function Scene({kind='dialog',disableEnforceFocus=false,disableAutoFocus=false,view=window}) {
 const [open,setOpen]=React.useState(false),[visible,setVisible]=React.useState(true),[nested,setNested]=React.useState(false),[inner,setInner]=React.useState(true);
 React.useLayoutEffect(()=>{view.control={setOpen,setVisible,setNested,setInner}});
 const options={open,disableEnforceFocus,disableAutoFocus};
 const content=<><button id="victim" hidden={!visible}>Current control</button><button id="nest" onClick={()=>setNested(true)}>Nested</button>{visible&&<button id="removed">Removed control</button>}</>;
 return <><button id="launch" onClick={()=>setOpen(true)}>Open</button>{kind==='dialog'?<Dialog {...options} container={view.document.body} transitionDuration={0}><section id="inside">{content}</section></Dialog>:<TrapFocus {...options}><section id="inside" tabIndex={-1}>{content}</section></TrapFocus>}
 {kind==='dialog'&&<Dialog open={nested} container={view.document.body} transitionDuration={0}><section id="nested">{inner&&<button id="inner-removed">Inner control</button>}</section></Dialog>}</>;
}
const host=document.body.appendChild(document.createElement('main')),root=createRoot(host);let version=0,frameRoot,frame;
window.draw=props=>flushSync(()=>root.render(<Scene key={++version} {...props}/>));
window.change=(name,value)=>flushSync(()=>window.control[name](value));
window.mountFrame=()=>{frame=document.body.appendChild(document.createElement('iframe'));frame.id='frame';const view=frame.contentWindow;frameRoot=createRoot(view.document.body.appendChild(view.document.createElement('main')));flushSync(()=>frameRoot.render(<Scene view={view}/>));window.frameView=view;};
window.removeFrame=()=>{flushSync(()=>frameRoot.unmount());frame.remove()};
