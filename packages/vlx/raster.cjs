'use strict';
// Rasterize only the bounded SVG vocabulary emitted by VLX, never arbitrary SVG,
// remote assets, system fonts or CSS. The public math/page APIs own layout.
const {VlxError}=require('./source.cjs'),{PNG}=require('vpngjs'),path=require('./raster-paths.cjs'),{encodePng}=require('./raster-png.cjs');
const fail=message=>{throw new VlxError('RASTER',message)};
const named={black:'#000000',white:'#ffffff',red:'#ff0000',blue:'#0000ff',green:'#008000',gray:'#808080',orange:'#ffa500',purple:'#800080'};
function color(value,current){if(value==='none')return null;if(value==='currentColor')return current;value=named[value]||value;if(!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value))fail('Unsupported drawing color');if(value.length===4)value='#'+[...value.slice(1)].map(c=>c+c).join('');return [parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16),255];}
function number(value,fallback=0){if(value==null)return fallback;const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>1e9)fail('Invalid drawing coordinate');return n;}
function blend(data,i,r,g,b,coverage){if(coverage<=0)return;coverage=Math.min(1,coverage);const old=data[i+3]/255,alpha=coverage+old*(1-coverage);if(alpha===0)return;const retained=old*(1-coverage);data[i]=Math.round((r*coverage+data[i]*retained)/alpha);data[i+1]=Math.round((g*coverage+data[i+1]*retained)/alpha);data[i+2]=Math.round((b*coverage+data[i+2]*retained)/alpha);data[i+3]=Math.round(alpha*255);}
// Nonzero winding scan conversion. Integrate horizontal pixel spans at eight
// subrows, splitting additionally at vertices so thin horizontal rules retain
// their exact vertical coverage instead of snapping to a sampling grid.
function paint(polygons,ink,surface,budget){
 if(!ink)return;const {width,height,data}=surface,edges=[];let lo=Infinity,hi=-Infinity,minPoint=Infinity,maxPoint=-Infinity;
 for(const points of polygons)for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];minPoint=Math.min(minPoint,a[0]);maxPoint=Math.max(maxPoint,a[0]);if(a[1]===b[1])continue;const lower=a[1]<b[1]?a:b,upper=a[1]<b[1]?b:a;edges.push([lower[0],lower[1],upper[1],(upper[0]-lower[0])/(upper[1]-lower[1]),a[1]<b[1]?1:-1]);lo=Math.min(lo,lower[1]);hi=Math.max(hi,upper[1]);}
 if(!edges.length)return;if(edges.length>2000000)throw new VlxError('LIMIT','Raster edge budget exceeded');
 const first=Math.max(0,Math.floor(lo)),last=Math.min(height,Math.ceil(hi));if(first>=last)return;
 budget.work+=(last-first)*8*edges.length;if(budget.work>300000000)throw new VlxError('LIMIT','Raster sampling budget exceeded');
 const offset=Math.max(0,Math.floor(minPoint)),limit=Math.min(width,Math.ceil(maxPoint));if(offset>=limit)return;
 const coverage=new Float32Array(limit-offset),hitsX=[],hitsW=[],active=[];edges.sort((a,b)=>a[1]-b[1]);let next=0;
 for(let y=first;y<last;y++){
  coverage.fill(0);let minX=width,maxX=0;
  let retained=0;for(let i=0;i<active.length;i++)if(active[i][2]>y)active[retained++]=active[i];active.length=retained;
  while(next<edges.length&&edges[next][1]<y+1){const e=edges[next++];if(e[2]>y)active.push(e);}
  const cuts=[y,y+1];for(let i=1;i<8;i++)cuts.push(y+i/8);
  for(const edge of active){if(edge[1]>y&&edge[1]<y+1)cuts.push(edge[1]);if(edge[2]>y&&edge[2]<y+1)cuts.push(edge[2]);}
  cuts.sort((a,b)=>a-b);
  budget.work+=Math.max(0,cuts.length-9)*edges.length;if(budget.work>300000000)throw new VlxError('LIMIT','Raster sampling budget exceeded');
  for(let sample=1;sample<cuts.length;sample++){
   const weight=cuts[sample]-cuts[sample-1];if(!weight)continue;const at=(cuts[sample]+cuts[sample-1])/2;let count=0;
   // Small glyph rows avoid pair allocations. Large/adversarial edge sets
   // retain O(n log n) sorting rather than quadratic insertion work.
   if(active.length>64){const hits=[];for(const e of active)if(at>=e[1]&&at<e[2])hits.push([e[0]+(at-e[1])*e[3],e[4]]);hits.sort((a,b)=>a[0]-b[0]);count=hits.length;for(let i=0;i<count;i++){hitsX[i]=hits[i][0];hitsW[i]=hits[i][1];}}
   else {for(let i=0;i<active.length;i++){const e=active[i];if(at<e[1]||at>=e[2])continue;const x=e[0]+(at-e[1])*e[3];let j=count;while(j>0&&hitsX[j-1]>x){hitsX[j]=hitsX[j-1];hitsW[j]=hitsW[j-1];j--;}hitsX[j]=x;hitsW[j]=e[4];count++;}}
   let winding=0,from=0;
   for(let i=0;i<count;i++){const x=hitsX[i],previous=winding;winding+=hitsW[i];if(!previous&&winding)from=x;else if(previous&&!winding){const left=Math.max(0,from),right=Math.min(width,x);if(right<=left)continue;const l=Math.floor(left),r=Math.ceil(right);minX=Math.min(minX,l);maxX=Math.max(maxX,r);
    if(r-l===1)coverage[l-offset]+=(right-left)*weight;
    else {coverage[l-offset]+=(l+1-left)*weight;for(let px=l+1;px<r-1;px++)coverage[px-offset]+=weight;coverage[r-1-offset]+=(right-r+1)*weight;}
   }}
  }
  for(let x=minX;x<maxX;x++)if(coverage[x-offset]>0)blend(data,(y*width+x)*4,ink[0],ink[1],ink[2],Math.min(1,coverage[x-offset])*ink[3]/255);
 }
}
// Axis-aligned rectangles have separable exact coverage. Fill opaque interiors
// in bulk; fractional edges still use source-over with their geometric area.
function fillRect(points,ink,surface,budget){
 const [a,b,c,d]=points;if(a[1]!==b[1]||b[0]!==c[0]||c[1]!==d[1]||d[0]!==a[0])return false;
 const x0=Math.min(a[0],c[0]),x1=Math.max(a[0],c[0]),y0=Math.min(a[1],c[1]),y1=Math.max(a[1],c[1]),left=Math.max(0,Math.floor(x0)),right=Math.min(surface.width,Math.ceil(x1)),top=Math.max(0,Math.floor(y0)),bottom=Math.min(surface.height,Math.ceil(y1));
 // Preserve the reference path's work accounting even though no samples run.
 budget.work+=Math.max(0,bottom-top)*16+(y0>=0&&y0<surface.height&&y0%1?4:0)+(y1>=0&&y1<surface.height&&y1%1?4:0);if(budget.work>300000000)throw new VlxError('LIMIT','Raster sampling budget exceeded');
 const rgba=Buffer.from(ink),fullLeft=Math.max(left,Math.ceil(x0)),fullRight=Math.min(right,Math.floor(x1));
 for(let y=top;y<bottom;y++){const cy=Math.min(y1,y+1)-Math.max(y0,y),row=y*surface.width*4;
  if(cy===1&&ink[3]===255&&fullRight>fullLeft)surface.data.fill(rgba,row+fullLeft*4,row+fullRight*4);
  for(let x=left;x<right;x++){if(cy===1&&ink[3]===255&&x>=fullLeft&&x<fullRight){x=fullRight-1;continue;}const coverage=(Math.min(x1,x+1)-Math.max(x0,x))*cy*ink[3]/255;if(coverage>0)blend(surface.data,row+x*4,ink[0],ink[1],ink[2],coverage);}
 }return true;
}
// Interpolate premultiplied RGBA to avoid colored fringes from transparent
// pixels, then composite into the unpremultiplied PNG output buffer.
function image(attrs,matrix,surface,budget){
 const uri=attrs.href;if(!/^data:image\/png;base64,[A-Za-z\d+/]*={0,2}$/.test(uri||''))fail('Drawing images must be embedded PNGs');
 const png=PNG.sync.read(Buffer.from(uri.slice(22),'base64'),{maxPixels:16000000,maxBytes:10*1024*1024});budget.imagePixels+=png.width*png.height;if(budget.imagePixels>32000000)throw new VlxError('LIMIT','Raster image budget exceeded');
 const x=number(attrs.x),y=number(attrs.y),w=number(attrs.width),h=number(attrs.height);if(w<=0||h<=0)return;
 const m=path.multiply(matrix,[w/png.width,0,0,h/png.height,x,y]),det=m[0]*m[3]-m[1]*m[2];if(!det)return;
 const inv=[m[3]/det,-m[1]/det,-m[2]/det,m[0]/det],corners=[[0,0],[png.width,0],[0,png.height],[png.width,png.height]].map(p=>path.apply(m,p));
 const left=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),right=Math.min(surface.width,Math.ceil(Math.max(...corners.map(p=>p[0])))),top=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),bottom=Math.min(surface.height,Math.ceil(Math.max(...corners.map(p=>p[1]))));
 for(let py=top;py<bottom;py++)for(let px=left;px<right;px++){
  const dx=px+.5-m[4],dy=py+.5-m[5],sx=inv[0]*dx+inv[2]*dy,sy=inv[1]*dx+inv[3]*dy;if(sx<0||sy<0||sx>=png.width||sy>=png.height)continue;
  const u=sx-.5,v=sy-.5,x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0;let a=0,r=0,g=0,b=0;
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){const ix=Math.max(0,Math.min(png.width-1,x0+i)),iy=Math.max(0,Math.min(png.height-1,y0+j)),n=(iy*png.width+ix)*4,weight=(i?fx:1-fx)*(j?fy:1-fy)*png.data[n+3]/255;a+=weight;r+=png.data[n]*weight;g+=png.data[n+1]*weight;b+=png.data[n+2]*weight;}
  if(a>0)blend(surface.data,(py*surface.width+px)*4,r/a,g/a,b/a,a);
 }
}
function rasterize(svg,{width:requestedWidth,background}={}){
 if(typeof svg!=='string'||svg.length>32*1024*1024)throw new VlxError('LIMIT','Drawing exceeds the SVG byte budget');
 const budget={points:0,work:0,imagePixels:0},stack=[],rootState={matrix:[1,0,0,1,0,0],color:[0,0,0,255],fill:'black',stroke:'none',strokeWidth:1,join:'miter',dash:null,offset:0};let surface,viewBox,ended=false,title=false,cursor=0;
 for(const match of svg.matchAll(/<([^>]+)>/g)){
  if(!title&&svg.slice(cursor,match.index).trim())fail('Unexpected drawing text');cursor=match.index+match[0].length;
  const raw=match[1],close=raw[0]==='/',self=raw.endsWith('/'),tag=/^\/?([\w-]+)/.exec(raw)?.[1];if(!tag)fail('Invalid drawing element');
  if(tag==='title'){title=!close&&!self;continue;}if(title)fail('Nested title markup');
  if(close){if(stack.at(-1)?.tag!==tag)fail('Unbalanced drawing groups');stack.pop();if(tag==='svg')ended=true;continue;}
  if(ended)fail('Multiple drawing roots');
  const attrs={};let offset=tag.length;const attr=/\s+([\w:-]+)="([^"]*)"/g;attr.lastIndex=offset;let item;
  while((item=attr.exec(raw))){if(raw.slice(offset,item.index).trim())fail('Invalid drawing attribute');if(Object.hasOwn(attrs,item[1]))fail('Duplicate drawing attribute');attrs[item[1]]=item[2].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');offset=attr.lastIndex;}
  if(raw.slice(offset).replace(/\/$/,'').trim())fail('Invalid drawing attributes');
  if(!['svg','g','a','path','rect','ellipse','image'].includes(tag))fail('Unsupported drawing element: '+tag);
  if(tag==='svg'){
   if(surface||stack.length)fail('Nested drawing roots are unsupported');viewBox=attrs.viewBox?.trim().split(/[\s,]+/).map(Number)||[0,0,number(attrs.width),number(attrs.height)];
   if(viewBox.length!==4||viewBox.some(n=>!Number.isFinite(n))||viewBox[2]<=0||viewBox[3]<=0)fail('Invalid drawing viewport');
   const sourceWidth=number(attrs.width),sourceHeight=number(attrs.height),factor=requestedWidth==null?1:requestedWidth/sourceWidth;
   const width=Math.round(sourceWidth*factor),height=Math.round(sourceHeight*factor);
   if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16384||height>16384||width*height>16777216)throw new VlxError('LIMIT','Raster dimensions exceed the pixel budget');
   surface={width,height,data:Buffer.alloc(width*height*4)};if(background==='white')surface.data.fill(255);else if(background&&background!=='transparent')fail('Unsupported raster background');
   const sx=width/viewBox[2],sy=height/viewBox[3];stack.push({...rootState,tag,matrix:[sx,0,0,sy,-viewBox[0]*sx,-viewBox[1]*sy]});continue;
  }
  if(!surface||!stack.length)fail('Drawing has no root');const state={...stack.at(-1),tag};
  if(attrs.transform)state.matrix=path.multiply(state.matrix,path.transform(attrs.transform));
  if(attrs.color)state.color=color(attrs.color,state.color);if(attrs.fill)state.fill=attrs.fill;if(attrs.stroke)state.stroke=attrs.stroke;if(attrs['stroke-width'])state.strokeWidth=number(attrs['stroke-width']);if(attrs['stroke-linejoin'])state.join=attrs['stroke-linejoin'];if(attrs['stroke-dasharray'])state.dash=attrs['stroke-dasharray'].split(/[\s,]+/).map(Number);if(attrs['stroke-dashoffset'])state.offset=number(attrs['stroke-dashoffset']);
  if(tag==='g'||tag==='a'){if(!self)stack.push(state);continue;}
  if(tag==='image'){image(attrs,state.matrix,surface,budget);continue;}
  const m=state.matrix,scale=Math.max(Math.hypot(m[0],m[1]),Math.hypot(m[2],m[3]));if(!scale)continue;const tolerance=.025/scale;let contours;
  if(tag==='path')contours=path.flatten(attrs.d||'',tolerance,budget);
  else if(tag==='rect'){const x=number(attrs.x),y=number(attrs.y),w=attrs.width==='100%'?viewBox[2]:number(attrs.width),h=attrs.height==='100%'?viewBox[3]:number(attrs.height);if(w<=0||h<=0)continue;contours=[{closed:true,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}];}
  else {const cx=number(attrs.cx),cy=number(attrs.cy),rx=number(attrs.rx),ry=number(attrs.ry);if(rx<=0||ry<=0)continue;contours=[{closed:true,points:path.circle(0,0,Math.max(rx,ry),tolerance).map(([x,y])=>[cx+x*rx/Math.max(rx,ry),cy+y*ry/Math.max(rx,ry)])}];}
  const fill=color(state.fill,state.color),stroke=color(state.stroke,state.color);
  if(fill){const polygons=contours.map(c=>c.points.map(p=>path.apply(m,p)));if(tag!=='rect'||!fillRect(polygons[0],fill,surface,budget))paint(polygons,fill,surface,budget);}
  if(stroke&&state.strokeWidth>0)paint(path.strokes(contours,state.strokeWidth,state.join,state.dash,state.offset,tolerance).map(polygon=>polygon.map(p=>path.apply(m,p))),stroke,surface,budget);
 }
 if(!surface||stack.length||!ended||svg.slice(cursor).trim())fail('Incomplete drawing');return surface;
}
function renderSvgPng(svg,options){const raster=rasterize(svg,options);return {data:encodePng(raster),width:raster.width,height:raster.height};}
module.exports={rasterize,renderSvgPng};
