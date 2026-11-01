import {runRetained} from './upstream-harness.mjs';
import {platform, autoUpdate, computePosition, flip, shift, offset, arrow, limitShift, size, hide, inline, autoPlacement} from '@floating-ui/dom';
import {placements} from '@floating-ui/utils';
import * as dom from '@floating-ui/utils/dom';
export async function run() {
  document.body.innerHTML = '<div id="scroll" style="position:relative;overflow:auto;width:320px;height:240px"><button id="reference" style="position:absolute;left:280px;top:200px;width:30px;height:25px">R</button><div id="floating" style="position:absolute;width:100px;height:60px"><span id="arrow" style="position:absolute;width:8px;height:8px"></span></div></div>';
  const reference=document.querySelector('#reference'),floating=document.querySelector('#floating');
  const positions=[];
  for(const rtl of [false,true]) {
    floating.style.direction=rtl?'rtl':'ltr';
    for(const placement of placements) {
      const pipelines=[
        [offset(4),flip({fallbackAxisSideDirection:'end',crossAxis:false}),shift({limiter:limitShift({offset:4})})],
        [offset(4),flip({crossAxis:placement.includes('-'),fallbackAxisSideDirection:'start',padding:4}),shift({padding:4})],
        [offset({mainAxis:4}),flip(),shift({padding:4})],
        [offset(6),flip({fallbackAxisSideDirection:'start'}),shift({padding:5}),arrow({element:document.querySelector('#arrow')})],
        [autoPlacement({alignment:'start'}),shift(),size(),hide(),hide({strategy:'escaped'})],
        [inline(),offset(3),flip(),shift()]
      ];
      for(const middleware of pipelines)positions.push(await computePosition(reference,floating,{placement,middleware}));
    }
  }
  const ids=nodes=>nodes.map(node=>node===window?'window':node===window.visualViewport?'viewport':node.id||node.nodeName);
  const overflow=ids(dom.getOverflowAncestors(reference));
  const scroll=document.querySelector('#scroll');scroll.style.transform='translateX(2px)';
  const containing=dom.getContainingBlock(reference).id;
  const host=document.createElement('div');host.id='host';scroll.append(host);const shadow=host.attachShadow({mode:'open'});const slot=document.createElement('slot');shadow.append(slot);const child=document.createElement('span');host.append(child);
  const shadowParent=dom.getParentNode(child)===slot && dom.getParentNode(slot)===host;
  const frame=document.createElement('iframe');scroll.append(frame);const foreign=frame.contentDocument.createElement('div');frame.contentDocument.body.append(foreign);
  const iframe=dom.isHTMLElement(foreign)&&dom.getOverflowAncestors(foreign)[0]===frame.contentWindow&&dom.getOverflowAncestors(foreign).includes(scroll);
  const dialog=document.createElement('dialog');document.body.append(dialog);dialog.showModal();const topLayer=dom.isTopLayer(dialog);dialog.close();
  const geometry=[];
  dialog.showModal();
  for(const mode of ['normal','scale','fixed','scroll','rtl','table','svg','shadow','virtual','iframe','top-layer']) {
    const container=document.createElement('div');container.style.cssText='position:relative;overflow:auto;width:300px;height:180px;border:3px solid;padding:7px';document.body.append(container);
    container.innerHTML='<button style="position:absolute;left:260px;top:145px;width:35px;height:25px">ref</button><div style="position:absolute;width:110px;height:65px">floating</div><div style="width:600px;height:400px"></div>';
    let ref=container.children[0],fl=container.children[1];
    if(mode==='scale')container.style.transform='scale(1.25,0.75)';
    if(mode==='fixed')fl.style.position='fixed';
    if(mode==='scroll'){container.scrollLeft=40;container.scrollTop=70;}
    if(mode==='rtl'){container.style.direction='rtl';fl.style.direction='rtl';}
    if(mode==='top-layer')dialog.append(fl);
    if(mode==='iframe'){ref=foreign;ref.style.cssText='width:35px;height:25px';}
    if(mode==='virtual'){const el=ref;ref={contextElement:el,getBoundingClientRect:()=>el.getBoundingClientRect()};}
    if(mode==='shadow'){const host=document.createElement('div');container.append(host);host.attachShadow({mode:'open'}).append(ref,fl);}
    if(mode==='table'){const table=document.createElement('table');table.innerHTML='<tbody><tr><td></td></tr></tbody>';container.append(table);table.querySelector('td').append(ref,fl);}
    if(mode==='svg'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.innerHTML='<rect x="3" y="4" width="35" height="25" />';container.append(svg);ref=svg.firstChild;}
    for(const strategy of ['absolute','fixed'])for(const placement of placements){
      const result=await computePosition(ref,fl,{strategy,placement,middleware:[offset(4),flip(),shift({padding:3}),hide()]});
      geometry.push(result);
    }
    const parent=platform.getOffsetParent(fl),rect={x:13,y:17,width:20,height:15};
    geometry.push(platform.convertOffsetParentRelativeRectToViewportRelativeRect({elements:{reference:ref,floating:fl},rect,offsetParent:parent,strategy:'absolute'}));
    for(const rootBoundary of ['viewport','layoutViewport','document',{x:5,y:8,width:600,height:400}]) geometry.push(platform.getClippingRect.call({...platform,_c:new Map()},{element:fl,boundary:[container],rootBoundary,strategy:'absolute'}));
    container.remove(); if(mode==='top-layer')fl.remove();
  }
  dialog.close();
  // Real observers and ancestor events, including upstream's two resize cases.
  const updates=[];
  for(const ancestorResize of [true,false]){
    let count=0;const stop=autoUpdate(reference,floating,()=>count++,{ancestorResize});count=0;
    window.dispatchEvent(new Event('resize'));updates.push(count);stop();
    window.dispatchEvent(new Event('resize'));updates.push(count);
  }
  const retained=await runRetained();
  return {positions,geometry,updates,retained,overflow,containing,shadowParent,iframe,topLayer};
}
