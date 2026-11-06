export async function checks({P,React,ReactDOM,document,variant,render,step,browser=false}){
  const h=React.createElement,win=document.defaultView,out=document.createElement('button'),results=[];out.id='outside';out.textContent='outside';document.body.append(out);
  const check=(value,label)=>{if(!value)throw Error(label);};
  const wait=(ms=20)=>step(()=>new Promise(r=>setTimeout(r,ms)));
  const until=async(test,label)=>{for(let i=0;i<50;i++){if(test())return;await wait();}throw Error(label);};
  const $=id=>document.getElementById(id)||document.querySelector('[data-test-id="'+id+'"]'),key=async(node,key,more={})=>{const e=new node.ownerDocument.defaultView.KeyboardEvent('keydown',{key,bubbles:true,composed:true,cancelable:true,...more});await step(()=>node.dispatchEvent(e));return e;};
  const pointer=async(node,type='pointermove',more={})=>{const e=new node.ownerDocument.defaultView.PointerEvent(type,{bubbles:true,composed:true,cancelable:true,pointerType:'mouse',pointerId:3,clientX:20,clientY:20,...more});await step(()=>node.dispatchEvent(e));return e;};
  const mount=async tree=>{await render(tree);await wait();},stop=async()=>{await render(null);await wait();};
  const items=()=>[h(P.Item,{id:'alpha',key:'a'},'Alpha'),h(P.Item,{id:'disabled',disabled:true,key:'d'},'Absent'),h(P.Item,{id:'beta',key:'b'},'Beta'),h(P.Item,{id:'bravo',key:'c'},'Bravo')];
  const menu=(children=items(),props={},content={})=>h(P.Root,{open:true,modal:false,...props},h(P.Anchor,{asChild:true},h('button',{id:'anchor'},'anchor')),h(P.Content,{id:'menu',avoidCollisions:false,...content},children));
  try{
    let closed=[],selected=[];
    await mount(menu(items(),{onOpenChange:value=>closed.push(value)},{loop:true}));
    check($('menu').getAttribute('role')==='menu' && $('menu').dataset.state==='open','menu semantics');check($('disabled').getAttribute('aria-disabled')==='true','disabled semantics');
    await key($('menu'),'Home');await until(()=>document.activeElement===$('alpha'),'Home first');await key($('alpha'),'ArrowDown');await until(()=>document.activeElement===$('beta'),'skip disabled');
    await key($('beta'),'End');await until(()=>document.activeElement===$('bravo'),'End last');await key($('bravo'),'ArrowDown');await until(()=>document.activeElement===$('alpha'),'loop to first');
    check((await key($('alpha'),'Tab')).defaultPrevented,'Tab stays in menu');
    await key($('alpha'),'b');await until(()=>document.activeElement===$('beta'),'typeahead beta');await key($('beta'),'b');await until(()=>document.activeElement===$('bravo'),'typeahead repeated letter');
    await stop();results.push('roles, disabled items, keyboard loop, Tab and typeahead');

    await mount(menu([h(P.Item,{id:'select',key:'a',onSelect:e=>{selected.push([e.type,e.bubbles,e.cancelable]);e.preventDefault();}},'Select'),h(P.Item,{id:'disabled',key:'b',disabled:true,onSelect:()=>selected.push('disabled')},'Disabled')],{onOpenChange:value=>closed.push(value)}));
    closed=[];await step(()=>$('select').click());check(selected.length===1&&selected[0].join()==='menu.itemSelect,true,true'&&!closed.length,'canceled item event');
    await step(()=>$('disabled').click());check(selected.length===1,'disabled not selected');
    await render(menu(h(P.Item,{id:'select',onSelect:()=>selected.push('current')},'Select'),{onOpenChange:value=>closed.push(value)}));
    await key($('select'),'Enter');check(selected.at(-1)==='current'&&closed.at(-1)===false,'fresh selection and close');
    await stop();results.push('cancelable selection, disabled selection and fresh callbacks');

    let checked=[],radio=[];
    await mount(menu([h(P.CheckboxItem,{key:'c',id:'check',checked:'indeterminate',onSelect:e=>e.preventDefault(),onCheckedChange:v=>checked.push(v)},'Check',h(P.ItemIndicator,{id:'check-mark'},'mark')),h(P.RadioGroup,{key:'r',value:'a',onValueChange:v=>radio.push(v)},h(P.RadioItem,{value:'a',id:'radio-a'},'A',h(P.ItemIndicator,{id:'radio-mark'},'mark')),h(P.RadioItem,{value:'b',id:'radio-b',onSelect:e=>e.preventDefault()},'B')),h(P.Separator,{key:'s',id:'separator'}),h(P.Label,{key:'l',id:'label'},'Label')]));
    check($('check').getAttribute('aria-checked')==='mixed'&&$('check-mark').dataset.state==='indeterminate','checkbox mixed indicator');
    await step(()=>$('check').click());check(checked.join()==='true','canceled selection still notifies checked state');await step(()=>$('radio-b').click());check(radio.join()==='b','radio selection');check($('radio-mark')&&$('separator').getAttribute('aria-orientation')==='horizontal','group/indicator/separator');
    await stop();results.push('checkbox, radio, indicators, groups and labels');

    await mount(menu([h(P.Item,{id:'same-a',key:'a'},'Same'),h(P.Item,{id:'same-b',key:'b'},'Same')]));await step(()=>$('same-a').focus());await key($('same-a'),'s');await wait();check(document.activeElement.id===(variant==='vpm'?'same-b':'same-a'),'paired duplicate label cycling');await stop();
    await mount(menu());await step(()=>$('alpha').focus());
    await step(()=>{$('alpha').dispatchEvent(new win.KeyboardEvent('keydown',{key:'b',bubbles:true}));out.focus();});await wait();check(document.activeElement.id===(variant==='vpm'?'outside':'beta'),'paired delayed typeahead focus ownership');await stop();
    await mount(menu());await step(()=>$('alpha').focus());await key($('alpha'),'b',{isComposing:true});await wait();check(document.activeElement.id===(variant==='vpm'?'alpha':'beta'),'paired IME typeahead');await stop();results.push('paired duplicate labels, later focus and IME ownership');

    await mount(menu([h(P.Item,{id:'alpha',key:'a',onKeyDown:e=>e.preventDefault()},'Alpha'),h(P.Item,{id:'beta',key:'b'},'Beta')]));await step(()=>$('alpha').focus());await key($('alpha'),'ArrowDown');await wait();check(document.activeElement===$('alpha'),'consumer key cancellation');await stop();
    await mount(menu(h('section',{id:'slotted'},items()),{}, {asChild:true}));check($('slotted').tagName==='SECTION','asChild');await stop();
    let releases=0;const ref=node=>{if(node)return()=>releases++;};await mount(h(React.StrictMode,null,menu(items(),{}, {ref})));const before=releases;await stop();check(releases===before+1,'React19 ref cleanup');results.push('consumer cancellation, slots and StrictMode refs');

    for(const dir of ['ltr','rtl']){
      function App(){const [open,setOpen]=React.useState(true),[sub,setSub]=React.useState(false);return h(P.Root,{open,onOpenChange:setOpen,modal:false,dir},h(P.Anchor,{asChild:true},h('button',{id:'sub-anchor'},'anchor')),h(P.Content,{id:'parent',avoidCollisions:false},h(P.Item,{id:'parent-first'},'first'),h(P.Sub,{open:sub,onOpenChange:setSub},h(P.SubTrigger,{'data-test-id':'sub-trigger'},'More'),h(P.Portal,null,h(P.SubContent,{'data-test-id':'child',avoidCollisions:false},h(P.Item,{id:'child-first'},'child'),h(P.Item,{id:'child-last'},'last'))))));}
      await mount(h(App));await step(()=>$('sub-trigger').focus());await key($('sub-trigger'),dir==='rtl'?'ArrowLeft':'ArrowRight');await until(()=>$('child-first')&&document.activeElement.id==='child-first','submenu keyboard entry '+dir);check($('sub-trigger').getAttribute('aria-expanded')==='true'&&$('child').getAttribute('aria-labelledby')===$('sub-trigger').id && $('sub-trigger').getAttribute('aria-controls')===$('child').id,'submenu ARIA');
      await key($('child-first'),dir==='rtl'?'ArrowRight':'ArrowLeft');await until(()=>!$('child')&&document.activeElement===$('sub-trigger'),'submenu return '+dir);
      await key($('sub-trigger'),'Enter');await until(()=>$('child-first'),'submenu reopen');await key($('child-first'),'Escape');await until(()=>!$('parent'),'Escape closes whole tree');await stop();
    }results.push('LTR/RTL nested keyboard, ARIA, return and Escape');

    let opens=[];
    const hover=(disabled=false)=>menu(h(P.Sub,{open:false,onOpenChange:v=>opens.push(v)},h(P.SubTrigger,{id:'hover',disabled},'hover'),h(P.SubContent,null,h(P.Item,null,'child'))));
    await mount(hover());opens=[];await pointer($('hover'));await wait(120);check(opens.includes(true),'mouse hover opens submenu');await stop();
    await mount(hover());opens=[];await pointer($('hover'),'pointermove',{pointerType:'touch'});await wait(120);check(!opens.length,'touch move does not hover open');
    await pointer($('hover'));await render(hover(true));await wait(120);check(opens.includes(true)===(variant==='upstream'),'paired disabling cancels pending hover');await stop();results.push('mouse/touch hover and paired disabled timer cancellation');

    const outsideWas=out.getAttribute('aria-hidden');await mount(menu(items(),{modal:true}));check(document.body.style.pointerEvents==='none','modal pointer block');check(out.getAttribute('aria-hidden')==='true','modal hides background');
    await step(()=>out.focus());check($('menu').contains(document.activeElement),'modal focus trap');await stop();check(out.getAttribute('aria-hidden')===outsideWas&&!document.body.style.pointerEvents,'modal cleanup');
    if(browser){
      const frame=document.createElement('iframe');document.body.append(frame);const doc=frame.contentDocument;doc.body.innerHTML='<button id="frame-out">outside</button>';
      try{
        if(variant==='vpm'){
          await mount(ReactDOM.createPortal(menu(items(),{modal:true}),doc.body));
          check(doc.body.style.pointerEvents==='none'&&!document.body.style.pointerEvents,'iframe modal body');check(doc.querySelectorAll('[data-radix-focus-guard]').length===2,'iframe guards');
          const item=doc.getElementById('alpha');await step(()=>item.focus());await key(item,'ArrowDown');await until(()=>doc.activeElement.id==='beta','iframe navigation');
          await step(()=>doc.getElementById('frame-out').focus());check(doc.getElementById('menu').contains(doc.activeElement),'iframe trap');await stop();check(!doc.body.style.pointerEvents&&!doc.querySelector('[data-radix-focus-guard]'),'iframe cleanup');
        }
      }finally{frame.remove();}
    }
    results.push('modal accessibility, focus and cleanup');
    return results;
  }finally{await stop();out.remove();}
}
