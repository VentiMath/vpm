export async function checks({P,React,ReactDOM,document,variant,render,step}) {
  const h=React.createElement,win=document.defaultView,results=[];
  const ok=(value,label)=>{if(!value)throw Error(label);};
  const wait=()=>step(()=>new Promise(r=>setTimeout(r,20)));
  const until=async(fn,label)=>{for(let i=0;i<100;i++){if(fn())return;await wait();}throw Error(label);};
  const find=id=>document.querySelector(`[data-test-id="${id}"]`),active=()=>document.activeElement;
  const key=async(node,key,extra={})=>{let event;await step(()=>{event=new win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,composed:true,...extra});node.dispatchEvent(event);});return event;};
  const pointer=async(node,extra={})=>{let event;await step(()=>{event=new win.PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerType:'mouse',...extra});node.dispatchEvent(event);});return event;};
  const reset=async()=>{await render(null);await wait();};
  const item=(name,props={})=>h(P.Item,{'data-test-id':name,...props},name);
  const content=(props={},children=[item('first'),item('last')])=>h(P.Content,{'data-test-id':'menu',...props},React.Children.toArray(children));
  const trigger=props=>h(P.Trigger,{'data-test-id':'trigger',...props},'Open');
  const tree=(props={},button={},panel={})=>h(P.Root,props,trigger(button),h(P.Portal,null,content(panel)));
  const outside=document.createElement('button');outside.textContent='outside';document.body.append(outside);
  try {
    for(const activation of ['Enter',' ','ArrowDown']) {
      const changes=[];await render(tree({modal:false,onOpenChange:v=>changes.push(v)}));const button=find('trigger');button.focus();
      ok(button.type==='button'&&button.getAttribute('aria-haspopup')==='menu'&&button.getAttribute('aria-expanded')==='false','closed trigger attributes');
      ok((await key(button,activation)).defaultPrevented,'activation prevents native scrolling/click');await until(()=>active()===find('first'),'keyboard first item');
      ok(button.getAttribute('aria-controls')===find('menu').id&&find('menu').getAttribute('aria-labelledby')===button.id,'trigger and content IDs connect');
      await key(active(),'ArrowDown');await until(()=>active()===find('last'),'arrow next item');await key(active(),'Enter');
      await until(()=>!find('menu')&&active()===button,'selection returns trigger');ok(changes.join(',')==='true,false','uncontrolled notifications');await reset();
    }results.push('keyboard activation, IDs, navigation, selection and focus return');

    for(const event of [{button:2},{button:0,ctrlKey:true}]){await render(tree());await pointer(find('trigger'),event);ok(!find('menu'),'context click does not open');await reset();}
    await render(tree({modal:false}));ok((await pointer(find('trigger'))).defaultPrevented,'opening pointer prevents trigger focus');await until(()=>find('menu')&&active()===find('menu'),'pointer focuses content, not first item');
    await pointer(find('trigger'));await until(()=>!find('menu'),'trigger toggles closed');await reset();
    for(const disabled of [true,false]){
      await render(tree({},disabled?{disabled}:{onPointerDown:e=>e.preventDefault(),onKeyDown:e=>e.preventDefault()}));await key(find('trigger'),'Enter');await pointer(find('trigger'));ok(!find('menu'),'disabled or canceled trigger remains closed');await reset();
    }
    await render(tree());await key(find('trigger'),'Enter',{isComposing:true});ok(!!find('menu')===(variant==='upstream'),'IME confirmation policy');await reset();
    results.push('pointer buttons, toggle, disabled, cancellation and IME');

    let proposed=[];const ref=React.createRef();
    const controlled=open=>h(P.Root,{open,onOpenChange:v=>proposed.push(v),modal:false},h(P.Trigger,{asChild:true,ref},h('button',{'data-test-id':'trigger'},'custom')),content());
    await render(controlled(false));ok(ref.current===find('trigger'),'asChild forwarded ref');await key(ref.current,'Enter');ok(proposed[0]===true&&!find('menu'),'controlled proposal does not mutate state');
    await render(controlled(true));await until(()=>find('menu'),'controlled open');await key(find('menu'),'Escape');ok(proposed.at(-1)===false&&find('menu'),'controlled close proposal');await render(controlled(false));await until(()=>!find('menu'),'controlled parent close');await reset();ok(ref.current===null,'ref cleanup');
    await render(tree({defaultOpen:true,modal:false}));await until(()=>find('menu'),'defaultOpen');await reset();let clicked=0;const itemRef=React.createRef();
    await render(h(P.DropdownMenu,{modal:false},h(P.DropdownMenuTrigger,{asChild:true},h('button',{'data-test-id':'trigger'},'Actions')),
      h(P.DropdownMenuContent,{'data-test-id':'menu',align:'start'},h('div',{role:'group'},h(P.DropdownMenuItem,{asChild:true,ref:itemRef},h('button',{'data-test-id':'nested-button',onClick:()=>clicked++},'Save'))))));
    const slottedTrigger=find('trigger');slottedTrigger.focus();await key(slottedTrigger,'ArrowDown');await until(()=>active()===find('nested-button'),'Amplify-shaped nested button entry');
    ok(itemRef.current===find('nested-button'),'slotted item ref');await key(active(),'Enter');await until(()=>!find('menu')&&active()===slottedTrigger,'slotted button selection');ok(clicked===1,'slotted onClick delivered once');await reset();
    results.push('controlled/default state, asChild refs and Amplify-shaped nested buttons');

    for(const modal of [false,true]){
      const closes=[];await render(tree({modal,onOpenChange:v=>closes.push(v)}));const button=find('trigger');button.focus();await key(button,'ArrowDown');await until(()=>active()===find('first'),'outside fixture opens');
      await wait();await pointer(outside,{button:modal?2:0});if(!modal)outside.focus();await until(()=>!find('menu'),'outside closes');await wait();
      ok(active()!==button,'outside interaction does not steal focus back');if(!modal)ok(active()===outside,'nonmodal outside focus survives');ok(closes.join(',')==='true,false','outside close notification');await reset();
    }
    await render(tree({modal:false},{},{onInteractOutside:e=>e.preventDefault()}));await key(find('trigger'),'ArrowDown');await until(()=>find('menu'),'cancel outside opens');await wait();await pointer(outside);ok(find('menu'),'canceled outside remains open');await reset();
    await render(tree({modal:false},{},{onCloseAutoFocus:e=>{e.preventDefault();outside.focus();}}));await key(find('trigger'),'ArrowDown');await until(()=>find('menu'),'custom close opens');await key(find('menu'),'Escape');await until(()=>!find('menu')&&active()===outside,'custom focus override');await reset();results.push('modal/nonmodal outside interaction and cancelable focus return');

    const useScope=P.createDropdownMenuScope();
    function Scoped(){const scope=useScope();return h(P.Root,{...scope,defaultOpen:true,modal:false},h(P.Root,{modal:false},h(P.Trigger,{...scope,'data-test-id':'outer-trigger'},'outer'),h(P.Trigger,{'data-test-id':'inner-trigger'},'inner'),h(P.Content,{...scope,'data-test-id':'outer-menu'},h(P.Item,scope,'outer')),h(P.Content,{'data-test-id':'inner-menu'},h(P.Item,null,'inner'))));}
    await render(h(Scoped));await until(()=>find('outer-menu'),'scoped outer content');ok(!find('inner-menu')&&find('outer-trigger').getAttribute('aria-expanded')==='true'&&find('inner-trigger').getAttribute('aria-expanded')==='false','scope isolation');await reset();results.push('composed scope isolation');

    for(const dir of ['ltr','rtl']){
      const changed=[];await render(h(P.Root,{dir,modal:false},trigger(),content({},[
        h(P.Sub,{onOpenChange:v=>changed.push(v)},h(P.SubTrigger,{'data-test-id':'sub-trigger'},'More'),h(P.Portal,null,h(P.SubContent,{'data-test-id':'sub-menu'},item('nested')))),item('last')])));
      const button=find('trigger');button.focus();await key(button,'ArrowDown');await until(()=>active()===find('sub-trigger'),'sub trigger entry');await key(active(),dir==='ltr'?'ArrowRight':'ArrowLeft');await until(()=>active()===find('nested'),'submenu entry');
      ok(find('sub-trigger').getAttribute('aria-controls')===find('sub-menu').id,'submenu IDs');ok(find('sub-menu').style.getPropertyValue('--radix-dropdown-menu-trigger-width')==='var(--radix-popper-anchor-width)','sub CSS alias');
      await key(active(),dir==='ltr'?'ArrowLeft':'ArrowRight');await until(()=>!find('sub-menu')&&active()===find('sub-trigger'),'submenu close direction');ok(changed.join(',')==='true,false','submenu uncontrolled notifications');
      await key(active(),dir==='ltr'?'ArrowRight':'ArrowLeft');await until(()=>find('nested'),'reopen sub');await key(find('nested'),'Enter');await until(()=>!find('menu')&&active()===button,'submenu selection closes root');await reset();
    }results.push('LTR/RTL uncontrolled submenus, selection and CSS aliases');

    const checks=[],radios=[];await render(h(P.Root,{defaultOpen:true,modal:false},trigger(),content({style:{color:'red'}},[
      h(P.Label,null,'Options'),h(P.Group,null,h(P.CheckboxItem,{'data-test-id':'check',checked:'indeterminate',onSelect:e=>e.preventDefault(),onCheckedChange:v=>checks.push(v)},h(P.ItemIndicator,{'data-test-id':'indicator'},'mark'))),h(P.RadioGroup,{value:'a',onValueChange:v=>radios.push(v)},h(P.RadioItem,{value:'a'},'A'),h(P.RadioItem,{'data-test-id':'radio',value:'b',onSelect:e=>e.preventDefault()},'B')),h(P.Separator),h(P.Arrow),])));
    await until(()=>find('check'),'parts mount');ok(find('check').getAttribute('aria-checked')==='mixed'&&find('indicator'),'checkbox/indicator');await step(()=>find('check').click());await step(()=>find('radio').click());ok(checks[0]===true&&radios[0]==='b'&&find('menu'),'canceled selection retains checkbox/radio notifications');
    ok(find('menu').style.color==='red'&&find('menu').style.getPropertyValue('--radix-dropdown-menu-content-transform-origin')==='var(--radix-popper-transform-origin)','content CSS aliases preserve style');ok(document.querySelector('[role="separator"]'),'separator');await reset();results.push('checkbox/radio selection, all presentation parts and CSS aliases');

    const frame=document.createElement('iframe');document.body.append(frame);const doc=frame.contentDocument,host=doc.createElement('div');doc.body.append(host);
    await render(ReactDOM.createPortal(h(P.Root,{modal:false},trigger(),h(P.Portal,{container:doc.body},content())),host));
    const button=doc.querySelector('[data-test-id="trigger"]');button.focus();await key(button,'ArrowDown');await until(()=>doc.activeElement?.getAttribute('data-test-id')===(variant==='vpm'?'first':'menu'),'paired iframe keyboard entry');
    await key(doc.activeElement,'Escape');await until(()=>!doc.querySelector('[role="menu"]')&&doc.activeElement===button,'iframe trigger restoration');await reset();frame.remove();results.push('portal owner-document keyboard and focus return');
    return results;
  }finally{await reset();outside.remove();}
}
