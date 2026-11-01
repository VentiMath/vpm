import {computePosition, flip, shift, offset, arrow, limitShift, size, hide, inline, autoPlacement} from '@floating-ui/dom';
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
  return {positions,overflow,containing,shadowParent,iframe,topLayer};
}
