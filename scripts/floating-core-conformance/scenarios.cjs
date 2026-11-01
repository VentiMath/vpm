'use strict';
const placements=['top','right','bottom','left'].flatMap(side=>[side,side+'-start',side+'-end']);
function fixture(api, index, observe = []) {
 const reference={id:'reference'},floating={id:'floating',clientWidth:90,clientHeight:60},arrow={id:'arrow'};
 const box={reference:{x:(index*47)%340-30,y:(index*31)%260-20,width:8+(index*7)%100,height:6+(index*11)%80},floating:{x:0,y:0,width:40+(index*17)%100,height:20+(index*13)%100}};
 const scale=index%5===0?{x:2,y:1.5}:{x:1,y:1};
 const platform={
  isRTL:()=>index%2===1,
  getElementRects:({reference:r})=>({reference:r.getBoundingClientRect?r.getBoundingClientRect():{...box.reference},floating:{...box.floating}}),
  getClippingRect:()=>({x:0,y:0,width:320,height:240}),
  getDimensions:element=>element===arrow?{width:8,height:8}:{width:box.floating.width,height:box.floating.height},
  getOffsetParent:()=>floating,isElement:()=>true,getScale:()=>scale,
  convertOffsetParentRelativeRectToViewportRelativeRect:({rect})=>({...rect,x:rect.x*scale.x,y:rect.y*scale.y,width:rect.width*scale.x,height:rect.height*scale.y}),
  getClientRects:()=>[api.rectToClientRect(box.reference),api.rectToClientRect({...box.reference,x:box.reference.x+10,y:box.reference.y+box.reference.height,width:box.reference.width/2})],
 };
 const sets={
  plain:[],
  popover:[api.offset(4),api.flip({fallbackAxisSideDirection:'end',crossAxis:false}),api.shift({limiter:api.limitShift({offset:4})})],
  tooltip:[api.offset(4),api.flip({crossAxis:placements[index%12].includes('-'),fallbackAxisSideDirection:'start',padding:4}),api.shift({padding:4})],
  dropdown:[api.offset({mainAxis:4}),api.flip(),api.shift({padding:4})],
  arrow:[api.offset(state=>({mainAxis:5,crossAxis:3,alignmentAxis:state.rects.reference.width/10})),api.flip(),api.shift({crossAxis:true}),api.arrow({element:arrow,padding:10})],
  alignment:[api.flip({crossAxis:'alignment',fallbackAxisSideDirection:'end',flipAlignment:index%2===0}),api.shift({limiter:api.limitShift({offset:()=>({mainAxis:3,crossAxis:5}),mainAxis:index%3!==0})})],
  initial:[api.flip({fallbackStrategy:'initialPlacement',fallbackPlacements:['top','left-start','right-end']})],
  auto:[api.autoPlacement({alignment:index%3===0?'start':undefined,crossAxis:true,autoAlignment:index%2===0}),api.shift({crossAxis:true})],
  allowed:[api.autoPlacement({allowedPlacements:['left-end','bottom-start','top'],crossAxis:index%2===0})],
  inline:[api.inline({x:box.reference.x+2,y:box.reference.y+1}),api.offset(2)],
  hide:[api.hide(),api.hide({strategy:'escaped'})],
  size:[api.shift(),api.size({padding:4,apply:state=>observe?.push([state.availableWidth,state.availableHeight])})],
  resize:[api.size({apply:()=>{box.floating.width=42;box.floating.height=26;}})],
 };
 return {reference,floating,platform,sets,box};
}
async function run(api,index,key,hook=false){const observed=[],f=fixture(api,index,observed);let calls=0;if(hook)f.platform.detectOverflow=(state,options)=>{calls++;return api.detectOverflow(state,options);};const result=await api.computePosition(f.reference,f.floating,{placement:placements[index%12],strategy:index%2?'fixed':'absolute',platform:f.platform,middleware:f.sets[key]});return {result,observed,calls};}
module.exports={fixture,run};
