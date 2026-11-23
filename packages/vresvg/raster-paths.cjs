'use strict';
const {RasterError:VlxError}=require('./error.cjs');
const fail=message=>{throw new VlxError('RASTER',message)};
const cache=new Map();let cachedBytes=0;
function commands(source){
 let result=cache.get(source);if(result)return result;
 if(source.length>1000000)fail('Drawing path is too long');
 const scan=/[MLCQHVZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g;
 const counts={M:2,L:2,C:6,Q:4,H:1,V:1,Z:0};
 let end=0,kind,row,count=0,m,expect=false;result=[];
 while((m=scan.exec(source))){
  if(!/^[\s,]*$/.test(source.slice(end,m.index)))fail('Unsupported drawing path command');
  end=scan.lastIndex;
  const token=m[0],code=token.charCodeAt(0);
  if(code>=65&&code<=90){
   const command=counts[token];
   if(row||expect)fail('Invalid drawing path coordinate');
   kind=token;count=command;expect=!!count;
   if(!count){result.push([kind]);kind=null;}
   continue;
  }
  if(!kind)fail('Path must start with a command');
  const value=Number(token);if(!Number.isFinite(value)||Math.abs(value)>1e9)fail('Invalid drawing path coordinate');
  expect=false;if(!row)row=[kind];row.push(value);
  if(row.length===count+1){result.push(row);row=null;if(kind==='M'){kind='L';count=2;}}
 }
 if(!/^[\s,]*$/.test(source.slice(end)))fail('Invalid drawing path');
 if(row||expect)fail('Invalid drawing path coordinate');
 if(source.length<=32768){
  // Bound retained arrays as well as string bytes. Pen paths often never recur.
  const bytes=source.length*2+result.reduce((n,row)=>n+40+row.length*8,0);
  if(cache.size>=2048||cachedBytes+bytes>2000000){cache.clear();cachedBytes=0;}
  cache.set(source,result);cachedBytes+=bytes;
 }
 return result;
}
const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function transform(value){let result=[1,0,0,1,0,0],end=0;for(const match of value.matchAll(/(translate|scale|skewX)\(([^)]*)\)/g)){if(value.slice(end,match.index).trim())fail('Unsupported drawing transform');const nums=match[2].trim().split(/[\s,]+/).map(Number);if(nums.some(n=>!Number.isFinite(n))||!nums.length||nums.length>2)fail('Invalid transform');let m;switch(match[1]){case 'translate':m=[1,0,0,1,nums[0],nums[1]??0];break;case 'scale':m=[nums[0],0,0,nums[1]??nums[0],0,0];break;default:m=[1,0,Math.tan(nums[0]*Math.PI/180),1,0,0];}result=multiply(result,m);end=match.index+match[0].length;}if(value.slice(end).trim())fail('Unsupported transform');return result;}
const geometryCache=new Map();let geometryPoints=0;
function flatten(source,tolerance,budget){
 const key=source+'\0'+tolerance,cached=geometryCache.get(key);
 if(cached){budget.points+=cached.count;if(budget.points>2000000)throw new VlxError('LIMIT','Raster geometry budget exceeded');return cached.contours;}
 const startingPoints=budget.points;
 const contours=[];let points,x=0,y=0,start;
 function put(px,py){if(++budget.points>2000000)throw new VlxError('LIMIT','Raster geometry budget exceeded');points.push([px,py]);x=px;y=py;}
 // Adaptive de Casteljau subdivision, bounded in output-pixel coordinates.
 function cubic(ax,ay,bx,by,cx,cy,dx,dy,depth=0){
  const chord=Math.hypot(dx-ax,dy-ay),length=Math.hypot(bx-ax,by-ay)+Math.hypot(cx-bx,cy-by)+Math.hypot(dx-cx,dy-cy);
  const cb=chord?Math.abs((bx-ax)*(dy-ay)-(by-ay)*(dx-ax))/chord:Math.hypot(bx-ax,by-ay);
  const cc=chord?Math.abs((cx-ax)*(dy-ay)-(cy-ay)*(dx-ax))/chord:Math.hypot(cx-ax,cy-ay);
  if(length-chord<=tolerance&&Math.max(cb,cc)<=tolerance){put(dx,dy);return;}
  if(depth>=20)throw new VlxError('LIMIT','Raster curve subdivision limit');
  const abx=(ax+bx)/2,aby=(ay+by)/2,bcx=(bx+cx)/2,bcy=(by+cy)/2,cdx=(cx+dx)/2,cdy=(cy+dy)/2;
  const abcx=(abx+bcx)/2,abcy=(aby+bcy)/2,bcdx=(bcx+cdx)/2,bcdy=(bcy+cdy)/2;
  const mx=(abcx+bcdx)/2,my=(abcy+bcdy)/2;
  cubic(ax,ay,abx,aby,abcx,abcy,mx,my,depth+1);cubic(mx,my,bcdx,bcdy,cdx,cdy,dx,dy,depth+1);
 }
 for(const [kind,...v]of commands(source)){
  if(kind==='M'){points=[];contours.push({points,closed:false});put(v[0],v[1]);start=[x,y];continue;}
  if(!points)fail('Path must begin with moveto');
  if(kind==='L')put(v[0],v[1]);else if(kind==='H')put(v[0],y);else if(kind==='V')put(x,v[0]);
  else if(kind==='C')cubic(x,y,v[0],v[1],v[2],v[3],v[4],v[5]);
  else if(kind==='Q')cubic(x,y,x+(v[0]-x)*2/3,y+(v[1]-y)*2/3,v[2]+(v[0]-v[2])*2/3,v[3]+(v[1]-v[3])*2/3,v[2],v[3]);
  else if(kind==='Z'){contours.at(-1).closed=true;[x,y]=start;}
 }
 const count=budget.points-startingPoints;
 if(source.length<=32768&&count<=10000){
  while(geometryCache.size>=512||geometryPoints+count>100000){const first=geometryCache.keys().next().value;geometryPoints-=geometryCache.get(first).count;geometryCache.delete(first);}
  geometryCache.set(key,{contours,count});geometryPoints+=count;
 }
 return contours;
}
function circle(cx,cy,r,tolerance){const n=Math.max(12,Math.min(2048,Math.ceil(Math.PI/Math.acos(Math.max(-1,1-tolerance/Math.max(r,tolerance))))));return Array.from({length:n},(_,i)=>[cx+r*Math.cos(i*2*Math.PI/n),cy+r*Math.sin(i*2*Math.PI/n)]);}
// Stroke strips and joins form one nonzero-winding union per draw, so shared
// edges/joins do not accumulate opacity. Generated dashed rules use butt ends.
function strokes(contours,width,join,dash,offset,tolerance,cap="butt",compactJoins=false){
 const polygons=[],r=width/2;let steps=0,vertices=0;
 function polygon(points){vertices+=points.length;if(vertices>2000000)throw new VlxError('LIMIT','Stroke geometry budget exceeded');let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1];}if(area<0)points.reverse();polygons.push(points);}
 function segment(a,b){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return;const nx=-dy*r/len,ny=dx*r/len;polygon([[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]]);}
 for(const contour of contours){const original=contour.points,p=compactJoins?original.filter((q,i,a)=>i===0||q[0]!==a[i-1][0]||q[1]!==a[i-1][1]):original;if(p.length<2){if(p.length&&original.length>1&&cap==='round')polygon(circle(p[0][0],p[0][1],r,tolerance));continue;}const points=contour.closed?[...p,p[0]]:p;
  if(dash){const total=dash.reduce((a,b)=>a+b,0);if(!(total>0)||dash.some(n=>n<=0))fail('Invalid stroke dash pattern');let position=((offset%total)+total)%total,index=0;while(position>=dash[index])position-=dash[index++];let remain=dash[index]-position;
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let cursor=0;while(cursor<len){if(++steps>1000000)throw new VlxError('LIMIT','Raster dash budget exceeded');const step=Math.min(remain,len-cursor);if(index%2===0)segment([a[0]+(b[0]-a[0])*cursor/len,a[1]+(b[1]-a[1])*cursor/len],[a[0]+(b[0]-a[0])*(cursor+step)/len,a[1]+(b[1]-a[1])*(cursor+step)/len]);cursor+=step;remain-=step;if(remain<1e-10){index=(index+1)%dash.length;remain=dash[index];}}}continue;
  }
  for(let i=1;i<points.length;i++)segment(points[i-1],points[i]);
  if(!contour.closed&&cap==='round'){polygon(circle(p[0][0],p[0][1],r,tolerance));polygon(circle(p.at(-1)[0],p.at(-1)[1],r,tolerance));}
  const from=contour.closed?0:1,to=contour.closed?p.length:p.length-1;
  for(let i=from;i<to;i++){const a=p[(i-1+p.length)%p.length],b=p[i],c=p[(i+1)%p.length];if(join==='round'&&!compactJoins){polygon(circle(b[0],b[1],r,tolerance));continue;}const u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],lu=Math.hypot(...u),lv=Math.hypot(...v);if(!lu||!lv)continue;const cross=u[0]*v[1]-u[1]*v[0];if(Math.abs(cross)<1e-12){if(join==='round'&&u[0]*v[0]+u[1]*v[1]<0)polygon(circle(b[0],b[1],r,tolerance));continue;}const sign=cross>0?-1:1,n1=[-u[1]/lu*r*sign,u[0]/lu*r*sign],n2=[-v[1]/lv*r*sign,v[0]/lv*r*sign],a1=[b[0]+n1[0],b[1]+n1[1]],a2=[b[0]+n2[0],b[1]+n2[1]],t=((a2[0]-a1[0])*v[1]-(a2[1]-a1[1])*v[0])/cross,m=[a1[0]+t*u[0],a1[1]+t*u[1]];if(join==='round'){
   const start=Math.atan2(n1[1],n1[0]);let delta=Math.atan2(n2[1],n2[0])-start;
   if(cross>0&&delta<0)delta+=2*Math.PI;else if(cross<0&&delta>0)delta-=2*Math.PI;
   const maxAngle=2*Math.acos(Math.max(-1,1-tolerance/Math.max(r,tolerance))),count=Math.max(1,Math.ceil(Math.abs(delta)/maxAngle)),arc=[b,a1];
   if(!Number.isFinite(count)||count>2048)throw new VlxError('LIMIT','Round join subdivision limit');
   for(let j=1;j<count;j++){const angle=start+delta*j/count;arc.push([b[0]+r*Math.cos(angle),b[1]+r*Math.sin(angle)]);}arc.push(a2);polygon(arc);
  }else polygon(Math.hypot(m[0]-b[0],m[1]-b[1])<=4*r?[b,a1,m,a2]:[b,a1,a2]);}
 }
 return polygons;
}
module.exports={apply,multiply,transform,flatten,circle,strokes};
