// Shared behavioral assertions run against upstream and VPM in jsdom and Chrome.
export async function checks({P, React, ReactDOM, root, document, variant, render, step, browser = false}) {
  const h = React.createElement, result = [], win = document.defaultView;
  const check = (ok, label) => { if (!ok) throw Error(label); };
  const sleep = () => new Promise(resolve => win.setTimeout(resolve, 10));
  const settle = () => step(sleep);
  const $ = id => document.getElementById(id);
  const outside = document.createElement('button'); outside.id = 'outside'; outside.textContent = 'outside'; document.body.append(outside);
  const portal = document.createElement('aside'); document.body.append(portal);
  const fire = async (node, type, extra = {}) => {
    const view = node.ownerDocument.defaultView;
    const Kind = type === 'keydown' ? view.KeyboardEvent : type.startsWith('focus') ? view.FocusEvent : view.PointerEvent || view.MouseEvent;
    const event = new Kind(type, {bubbles:true, composed:true, cancelable:true, button:0, pointerId:7, ...extra});
    await step(() => node.dispatchEvent(event)); return event;
  };
  const layer = (props = {}, children = h('button', {id:'inside'}, 'inside')) => h(P.Root, {id:'layer', ...props}, children);
  const stop = async () => { await render(null); await settle(); };
  const mount = async tree => { await render(tree); await settle(); };
  let frame;
  try {
    let calls = [], detail;
    await mount(layer({onPointerDownOutside:e => {calls.push('pointer'); detail = e;}, onFocusOutside:()=>calls.push('focus'), onInteractOutside:()=>calls.push('interact'), onDismiss:()=>calls.push('dismiss')}));
    await fire($('inside'), 'pointerdown'); check(!calls.length, 'inside pointer must not dismiss');
    await step(()=>$('inside').focus()); check(!calls.length, 'inside focus must not dismiss');
    const original = await fire(outside, 'pointerdown'); check(calls.join() === 'pointer,interact,dismiss', 'outside callback order');
    check(detail.detail.originalEvent === original && detail.cancelable && !detail.bubbles && detail.target === outside, 'custom event contract');
    calls=[]; await step(()=>outside.focus()); check(calls.join() === 'focus,interact,dismiss', 'outside focus');
    calls=[]; await fire(outside,'keydown',{key:'Escape'}); check(calls.join()==='dismiss','Escape dismisses');
    await stop(); result.push('inside/outside pointer, focus, Escape and event contract');

    calls=[]; await mount(layer({onPointerDownOutside:e=>{calls.push('pointer');e.preventDefault();},onInteractOutside:()=>calls.push('interact'),onDismiss:()=>calls.push('dismiss'),onEscapeKeyDown:e=>e.preventDefault()}));
    await fire(outside,'pointerdown'); await fire(outside,'keydown',{key:'Escape'}); check(calls.join()==='pointer,interact','canceled dismissal');
    await render(layer({onDismiss:()=>calls.push('fresh')})); await fire(outside,'pointerdown'); check(calls.at(-1)==='fresh','fresh callbacks');
    await stop(); result.push('cancellation and current callbacks');

    calls=[]; await mount(layer({onDismiss:()=>calls.push('outside')},h('button',{id:'inside',onPointerDown:e=>e.stopPropagation()},'stop')));
    await fire($('inside'),'pointerdown'); await fire(outside,'pointerdown'); check(calls.length===(variant==='vpm'?1:0),'paired stopped-inside pointer');
    await stop(); result.push('paired stopped-inside propagation');

    calls=[]; await mount(layer({onDismiss:()=>calls.push('parent')},ReactDOM.createPortal(h('button',{id:'portalled'},'portal'),portal)));
    await fire($('portalled'),'pointerdown'); await step(()=>$('portalled').focus()); check(!calls.length,'React portal is inside');
    await stop();
    const branchTree = tag => h(React.Fragment,null,layer({onDismiss:()=>calls.push('dismiss')}),h(P.Branch,{asChild:true},h(tag,{id:'branch',tabIndex:0},'branch')));
    calls=[]; await mount(branchTree('button')); await fire($('branch'),'pointerdown'); check(!calls.length,'branch pointer');
    await render(branchTree('section')); await settle(); await fire($('branch'),'pointerdown'); check(calls.length===(variant==='vpm'?0:1),'paired branch root replacement');
    await stop(); result.push('portals and paired branch replacement');

    calls=[]; await mount(layer({deferPointerDownOutside:true,onDismiss:()=>calls.push('dismiss'),onFocusOutside:()=>calls.push('focus')}));
    await fire(outside,'pointerdown'); await fire(outside,'focusin'); check(!calls.length,'deferred focus suppression');
    await fire(outside,'pointerup'); await fire(outside,'click'); check(calls.join()==='dismiss','complete deferred click'); await settle();
    calls=[]; await fire(outside,'pointerdown',{button:2}); check(calls.join()==='dismiss','secondary pointer is immediate');
    calls=[]; await fire(outside,'pointerdown'); const block = e => e.stopPropagation(); outside.addEventListener('mouseup',block,{once:true});
    await fire(outside,'mouseup'); await fire(outside,'click'); await settle(); check(!calls.length,'intercepted interaction does not dismiss');
    await fire(outside,'pointerdown'); outside.addEventListener('click',block,{once:true}); await fire(outside,'click'); await settle(); check(!calls.length,'stopped click does not dismiss');
    await fire(outside,'pointerdown'); await fire(outside,'pointercancel'); await fire(outside,'focusin');
    check(calls.join()===(variant==='vpm'?'focus,dismiss':''),'paired pointercancel releases focus');
    await stop();
    calls=[];await mount(layer({deferPointerDownOutside:true,onDismiss:()=>calls.push('dismiss')}));
    await step(()=>{
      outside.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:7}));
      outside.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
      outside.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:8}));
    });
    await settle();check(calls.length===(variant==='vpm'?1:2),'paired prior click timer cannot finish a new gesture');
    await stop(); result.push('deferred primary, secondary, interception, pointercancel and timer ownership');

    calls=[];
    function Surface(){return h('div',{id:'surface',ref:P.useDismissableLayerSurface(),onClick:e=>e.stopPropagation()},'surface');}
    await mount(h(React.Fragment,null,layer({deferPointerDownOutside:true,onDismiss:()=>calls.push('dismiss')}),h(Surface)));
    await fire($('surface'),'pointerdown'); await fire($('surface'),'click'); await settle(); check(calls.join()==='dismiss','surface allows stopped click');
    calls=[]; await fire($('surface'),'pointerdown'); await render(null); await fire(outside,'click'); await settle(); check(!calls.length,'unmounted deferred callback');
    result.push('dismissable surfaces and deferred teardown');

    calls=[]; await mount(layer({onDismiss:()=>calls.push('parent')}));
    await render(layer({onDismiss:()=>calls.push('parent')},ReactDOM.createPortal(layer({id:'child',onDismiss:()=>calls.push('child')}),portal))); await settle();
    await fire(outside,'keydown',{key:'Escape'}); check(calls.join()==='child','only highest Escape owner'); await stop();
    if(variant==='vpm'){
      calls=[]; await mount(layer({onDismiss:()=>calls.push('parent')},ReactDOM.createPortal(layer({id:'child',onDismiss:()=>calls.push('child')}),portal)));
      await fire(outside,'keydown',{key:'Escape'}); check(calls.join()==='child','simultaneous logical nesting');
      calls=[]; await fire(outside,'keydown',{key:'Escape',isComposing:true}); check(!calls.length,'composition Escape belongs to input'); await stop();
    }
    result.push('nested Escape ownership');

    const modalTree = lower => h(React.Fragment,null,layer({id:'lower',disableOutsidePointerEvents:lower}),layer({id:'upper',disableOutsidePointerEvents:true}));
    document.body.style.setProperty('pointer-events','auto','important');
    await mount(modalTree(false)); check(document.body.style.pointerEvents==='none' && $('lower').style.pointerEvents==='none' && $('upper').style.pointerEvents==='auto','modal cutoff');
    await render(modalTree(true)); await settle(); check($('lower').style.pointerEvents===(variant==='vpm'?'none':'auto'),'paired actual modal ordering');
    await stop(); check(document.body.style.pointerEvents==='auto','body restored');
    if(browser && variant==='vpm')check(document.body.style.getPropertyPriority('pointer-events')==='important','body priority restored');
    document.body.style.removeProperty('pointer-events');
    await mount(layer({disableOutsidePointerEvents:true})); document.body.style.pointerEvents='all'; await stop(); check(document.body.style.pointerEvents===(variant==='vpm'?'all':''),'paired later style owner'); document.body.style.removeProperty('pointer-events');
    if(variant==='vpm'){
      const replacing=blocking=>layer({asChild:true,disableOutsidePointerEvents:blocking},h(blocking?'article':'section',{id:'replace'},'replace'));
      await mount(replacing(true));check($('replace').style.pointerEvents==='auto','replacement initially modal');
      await render(replacing(false));await settle();check($('replace').style.pointerEvents==='' && !document.body.style.pointerEvents,'replacement clears prior pointer style');await stop();
    }
    result.push('paired modal ordering and style ownership');

    frame=document.createElement('iframe'); document.body.append(frame); const doc=frame.contentDocument;
    doc.body.innerHTML='<button id="frame-out">outside</button>';
    calls=[]; await mount(h(React.Fragment,null,layer({onDismiss:()=>calls.push('main')}),ReactDOM.createPortal(layer({onDismiss:()=>calls.push('frame')}),doc.body)));
    await fire(outside,'keydown',{key:'Escape'}); check(calls.join()===(variant==='vpm'?'main':''),'paired document Escape isolation');
    await stop();
    if(variant==='vpm'){
      calls=[];await mount(h(React.Fragment,null,layer({disableOutsidePointerEvents:true}),ReactDOM.createPortal(h(React.Fragment,null,layer({disableOutsidePointerEvents:true,onDismiss:()=>calls.push('frame')}),h(P.Branch,{id:'frame-branch'},'branch')),doc.body)));
      check(document.body.style.pointerEvents==='none' && doc.body.style.pointerEvents==='none','independent document locks');
      await fire(doc.getElementById('frame-branch'),'pointerdown');check(!calls.length,'iframe branch realm');
      await fire(doc.getElementById('frame-out'),'pointerdown');check(calls.join()==='frame','iframe outside pointer');
      await stop();check(!document.body.style.pointerEvents && !doc.body.style.pointerEvents,'independent locks released');
    }
    frame.remove();frame=null;result.push('paired document ownership and iframe events');

    let cleaned=0;const callback=node=>{if(node)return()=>cleaned++;};
    await mount(h(React.StrictMode,null,layer({asChild:true,ref:callback},h('article',{id:'slotted'},'slot'))));
    check($('slotted').tagName==='ARTICLE','asChild'); const before=cleaned; await stop(); check(cleaned===before+1,'ref cleanup');
    check(!document.body.style.pointerEvents,'StrictMode cleanup');result.push('slots, refs and StrictMode');
    if(browser && variant==='vpm'){
      calls=[]; const shadowHost=document.createElement('div'),shadow=shadowHost.attachShadow({mode:'open'});document.body.append(shadowHost);
      try{await mount(h(React.Fragment,null,layer({onDismiss:()=>calls.push('dismiss')}),ReactDOM.createPortal(h(P.Branch,null,h('button',{id:'shadow-button'},'branch')),shadow)));
        await fire(shadow.querySelector('button'),'pointerdown'); check(!calls.length,'shadow branch path'); await stop();
      }finally{shadowHost.remove();}
      result.push('shadow-root branch containment');
    }
    return result;
  } finally {await render(null);await settle();outside.remove();portal.remove();frame?.remove();}
}
