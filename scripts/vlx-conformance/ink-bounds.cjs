'use strict';
// Browser-only measurement used by the fixtures. Transparent native selection
// text has OS-font-dependent metrics and contributes to SVG#getBBox despite
// painting no ink. Measure the unchanged outline tree separately from native
// mouse/keyboard selection acceptance. Never alter the live React tree.
module.exports=function inkBounds(svg){
 const clone=svg.cloneNode(true);
 clone.querySelectorAll('.vlx-select').forEach(node=>node.remove());
 clone.style.position='absolute';clone.style.visibility='hidden';
 svg.parentNode.appendChild(clone);
 try{
  const group=clone.querySelector('g'),b=group.getBBox(),t=group.transform.baseVal.consolidate().matrix;
  return {x:b.x+t.e,y:b.y+t.f,width:b.width,height:b.height};
 }finally{clone.remove();}
};
