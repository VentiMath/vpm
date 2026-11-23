import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {observeMath} from '../../packages/vlx/dom.mjs';
import {pages,paintPage,rendered} from './surface.mjs';

const stage=document.querySelector('#stage'),reader=document.querySelector('#reader'),readButton=document.querySelector('#read');
for(const [p,page]of pages.entries()){
 const section=document.createElement('section'),heading=document.createElement('h2');heading.textContent=page.title;section.append(heading);
 for(const [i,line]of page.lines.entries()){
  const row=document.createElement('p');row.id=`formula-${p}-${i}`;row.tabIndex=-1;
  if(line.before)row.append(document.createTextNode(line.before));
  const span=document.createElement('span');span.innerHTML=rendered(line).html;row.append(span);
  if(line.after)row.append(document.createTextNode(line.after));section.append(row);
 }
 reader.append(section);
}
const stopMath=observeMath(reader);
function read(index){reader.hidden=false;readButton.setAttribute('aria-expanded','true');if(index){const formula=document.getElementById(index);formula.scrollIntoView({block:'center'});formula.focus();}else reader.scrollIntoView({block:'start'});}
readButton.onclick=()=>{if(reader.hidden)read();else{reader.hidden=true;readButton.setAttribute('aria-expanded','false');readButton.focus();}};
const receipt={three:THREE.REVISION,ready:false,updates:0,failures:[],tex:pages.flatMap(p=>p.lines.map(l=>l.tex))};window.vlxSurfaceReceipt=receipt;
try{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-hidden','true');stage.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#242722');
 const camera=new THREE.PerspectiveCamera(34,1,.05,100);camera.position.set(3,2,9.5);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(.2,0,0);controls.minDistance=4;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.8;
 scene.add(new THREE.HemisphereLight('#fff7e3','#8d7857',2.3));const light=new THREE.DirectionalLight('#fff3db',2);light.position.set(-4,6,8);scene.add(light);
 const book=new THREE.Group();book.position.x=-1.15;book.rotation.y=.1;scene.add(book);
 const pageMeshes=[],geometries=[],materials=[];
 function mesh(geometry,material,parent){geometries.push(geometry);materials.push(material);const m=new THREE.Mesh(geometry,material);parent.add(m);return m;}
 const cover=mesh(new THREE.BoxGeometry(4.42,3.02,.12),new THREE.MeshStandardMaterial({color:'#2e5048',roughness:1}),book);cover.position.z=-.12;
 for(let p=0;p<3;p++){
  const geometry=new THREE.PlaneGeometry(2.1,2.8,48,64),material=new THREE.MeshStandardMaterial({roughness:1,metalness:0}),m=mesh(geometry,material,p<2?book:scene);
  m.position.set(p===0?-1.08:p===1?1.08:3.1,p===2?.06:0,p===2?.12:0);m.userData.page=p;
  if(p===2){m.rotation.z=-.06;m.rotation.y=-.16;}pageMeshes.push(m);
 }
 function curl(amount){for(const [p,m]of pageMeshes.entries()){
  const a=m.geometry.attributes.position,uv=m.geometry.attributes.uv;
  for(let i=0;i<a.count;i++){const u=uv.getX(i),v=uv.getY(i);const z=p===2?amount*(Math.pow(Math.abs(v-.5)*2,6)*.55+.1*Math.sin(u*Math.PI)):amount*(.12*Math.sin(u*Math.PI)+(p===0?Math.pow(1-u,8):Math.pow(u,8))*.12);a.setZ(i,z);}
  a.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();
 }draw();}
 function draw(){renderer.render(scene,camera);}
 function resize(){const box=stage.getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();draw();}
 controls.addEventListener('change',draw);const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
 let generation=0,disposed=false;
 async function quality(width){const token=++generation,start=performance.now(),surfaces=await Promise.all(pages.map(p=>paintPage(p,width)));
  if(disposed||token!==generation)return;
  for(const [i,surface]of surfaces.entries()){
   const texture=new THREE.CanvasTexture(surface.canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.minFilter=THREE.LinearMipmapLinearFilter;
   const m=pageMeshes[i],old=m.material.map;m.material.map=texture;m.material.needsUpdate=true;m.userData.hits=surface.hits;old?.dispose();
  }
  draw();receipt.ready=true;receipt.updates++;receipt.width=width;receipt.setupMs=+(performance.now()-start).toFixed(2);receipt.gpuMiB=+(surfaces.reduce((s,p)=>s+p.pixels,0)*4*4/3/1048576).toFixed(1);receipt.textures=renderer.info.memory.textures;
  document.querySelector('#status').textContent='VLX outlines · '+width+' px/page · '+receipt.gpuMiB+' MiB with mipmaps';
 }
 document.querySelector('#quality').onchange=e=>quality(+e.target.value).catch(fail);
 document.querySelector('#curl').oninput=e=>curl(+e.target.value);
 for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{
  const preset={desk:{position:[3,2,9.5],target:[.2,0,0]},close:{position:[-1.15,0,6],target:[-1.15,0,0]},angle:{position:[6,1,5],target:[.65,0,0]}}[button.dataset.view];camera.position.set(...preset.position);controls.target.set(...preset.target);controls.update();draw();
 };
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects(pageMeshes)[0];if(!hit)return;const {page,hits}=hit.object.userData,uv=hit.uv;
  const formula=hits?.find(b=>uv.x>=b.x&&uv.x<=b.x+b.width&&1-uv.y>=b.y&&1-uv.y<=b.y+b.height);
  read(formula?`formula-${page}-${formula.index}`:`formula-${page}-0`);
 });
 function dispose(){if(disposed)return;disposed=true;generation++;resizeObserver.disconnect();controls.dispose();stopMath();for(const m of pageMeshes){m.material.map?.dispose();m.material.map=null;}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();receipt.disposedTextures=renderer.info.memory.textures;renderer.dispose();}
 window.addEventListener('pagehide',dispose,{once:true});window.vlxSurfaceTest={quality,dispose,draw,renderer,scene,camera,pageMeshes,read};
 curl(.7);resize();receipt.internalTextures=renderer.info.memory.textures;await quality(1024);
}catch(error){fail(error);read();}
function fail(error){receipt.failures.push(String(error));document.querySelector('#status').textContent='The 3D view is unavailable. The readable math remains available.';read();}
