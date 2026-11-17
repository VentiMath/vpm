'use strict';
// Compare identical VLX drawings; resvg is a test-only pixel control.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{Resvg}=require('@resvg/resvg-js'),{PNG}=require('../../packages/vpngjs');
const {renderMath}=require('../../packages/vlx'),{renderProblemSvg}=require('./load.cjs')('problem'),{rasterize,renderSvgPng}=require('../../packages/vlx/raster.cjs'),{encodePng}=require('../../packages/vlx/raster-png.cjs');
const summary={drawings:0,maxRelativeDifference:0,maxInkChange:0,worst:null};
function check(name,svg,options={}){
 const control=new Resvg(svg,{font:{loadSystemFonts:false},background:options.background==='transparent'?undefined:'white',...(options.width?{fitTo:{mode:'width',value:options.width}}:{})}).render();
 const a=PNG.sync.read(control.asPng()),b=rasterize(svg,{background:'white',...options});assert.deepEqual([b.width,b.height],[a.width,a.height],name+' dimensions');
 let difference=0,inkA=0,inkB=0;for(let i=0;i<a.data.length;i+=4){let da=0,db=0;for(let c=0;c<3;c++){const ca=(255-a.data[i+c])*a.data[i+3]/255,cb=(255-b.data[i+c])*b.data[i+3]/255;difference+=Math.abs(ca-cb);da+=ca;db+=cb;}inkA+=da;inkB+=db;}
 // AA may differ within an edge pixel; neither implementation may lose or
 // invent an isolated solid mark farther than one pixel from the other.
 const mask=im=>{const out=new Uint8Array(im.width*im.height);for(let j=0;j<out.length;j++)out[j]=(255-Math.min(im.data[j*4],im.data[j*4+1],im.data[j*4+2]))*im.data[j*4+3]/255;return out;};
 const ma=mask(a),mb=mask(b);
 for(const [own,other]of [[ma,mb],[mb,ma]])for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(own[y*a.width+x]>100){let neighbor=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(y+dy>=0&&y+dy<a.height&&x+dx>=0&&x+dx<a.width&&other[(y+dy)*a.width+x+dx]>32)neighbor=true;assert.ok(neighbor,name+' misplaced ink at '+x+','+y);}
 const relative=difference/Math.max(inkA,255),inkChange=Math.abs(inkA-inkB)/Math.max(inkA,255);summary.drawings++;if(relative>summary.maxRelativeDifference){summary.maxRelativeDifference=relative;summary.worst=name;}summary.maxInkChange=Math.max(summary.maxInkChange,inkChange);
 assert.ok(relative<.3,`${name}: edge/ink difference ${relative}`);assert.ok(inkChange<.25,`${name}: ink change ${inkChange}`);
 if(process.env.VLX_RASTER_OUTPUT&&name.startsWith('page ')){const dir=process.env.VLX_RASTER_OUTPUT;fs.mkdirSync(dir,{recursive:true});const file=name.replace(/[^a-z\d]+/gi,'-');fs.writeFileSync(path.join(dir,file+'-vpm.png'),encodePng(b));fs.writeFileSync(path.join(dir,file+'-resvg.png'),control.asPng());}
}
for(const [name,tex]of require('./output-cases.cjs'))for(const scale of [1,2]){const math=renderMath(tex,{display:true,fontSize:24});check(name+' '+scale,math.svg,{...(scale===2?{width:Math.ceil(math.width*2),background:'transparent'}:{})});}
// Every shipped outline, including curves and holes; no font file/system font lookup.
const fonts=require('../../packages/vlx/font/glyphs.json');for(let i=0;i<fonts.paths.length;i++)check('glyph '+i,`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="-1 -1 2 2"><path d="${fonts.paths[i]}" transform="scale(.001 -.001)"/></svg>`);
const rgba=Buffer.alloc(64*48*4);for(let y=0;y<48;y++)for(let x=0;x<64;x++){let i=(y*64+x)*4;rgba[i]=x*4;rgba[i+1]=y*5;rgba[i+2]=180;rgba[i+3]=Math.min(255,8*x);}
const figure={png:encodePng({width:64,height:48,data:rgba}),width:185};
const pages=[...require('./picture-corpus.cjs').pages,['array and figure',{statement:String.raw`Compare $\begin{array}{c:c}x&y\\\hdashline 3&7\end{array}$.`,figure,options:{A:'1',B:String.raw`\frac{3}{7}`,C:String.raw`10\sqrt[3]{10}`}}],['inline figures',{statementParts:[{kind:'text',text:'Before '},{kind:'image',figure},{kind:'text',text:' after.'},{kind:'image',display:'block',figure:{...figure,width:32}}]}],['prose list',{statement:'Choose.\n\\begin{itemize}\n\\item First $x^2$.\n\\item Second $\\sqrt{7}$.\n\\end{itemize}'}]];
for(const [name,page]of pages)check('page '+name,renderProblemSvg(page).svg);
console.log(JSON.stringify(summary));console.log('Owned rasterizer: identical-drawing dimensions, glyph/figure pixels and bounded edge differences pass against resvg 2.6.2.');
