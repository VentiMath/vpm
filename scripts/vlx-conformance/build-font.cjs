'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('@mathjax/src/js/util/asyncLoad/node.js');
const {MathJaxNewcmFont}=require('@mathjax/mathjax-newcm-font/js/svg.js');
(async()=>{
 const font=new MathJaxNewcmFont();await font.loadDynamicFiles();
 const chars=new Set([...Array.from({length:64},(_,i)=>String.fromCodePoint(i+192)),...Array.from({length:95},(_,i)=>String.fromCodePoint(i+32)),...'§■ℑℜ½¾®Жᵗʰⁿᵈő☺◉¶²³º˚●',...'⊙⋆⋄△⊗⊕□◇◆⧫♢♡∡⊤†⟶⟵⟼∗◯★⊡⊢∋♮♯♭↓↑⌢⨁⨂¥◦¢ăĂ‑',...'≅∼≃∤∦⩽⩾≁≄≇≉≢≰≱≮≯⊄⊅⊈⊉↛↚↮⇏⇍⇎',...'△ℓ≦≧•↦⟹⟺∣⊊∖∬∭⋃⋂ℙℍ',...'αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩϕϵϑς×÷±∓·⋅∘∞∑∏∫∂∇√≤≥≠≈≡∈∉⊂⊆⊃⊇∪∩∅∀∃¬∧∨→←↔⇒⇐⇔…⋯⋮⋱′″°∠⊥∥−ℝℤℕℚℂ⌈⌉⌊⌋⟨⟩‖–—‘’“”']);
 const data={};
 for(const variant of ['normal','italic','bold','bold-italic','double-struck','-tex-calligraphic','script','sans-serif','monospace','-largeop','-size3','-size4']){const out=data[variant]={};for(const char of chars){if(variant==='bold-italic'&&!/\p{L}/u.test(char))continue;let info=font.getChar(variant,char.codePointAt(0));if(info?.[3]?.smp)info=font.getChar('normal',info[3].smp);if(info&&info.slice(0,3).every(Number.isFinite)&&typeof info[3]?.p==='string')out[char]=[info[0],info[1],info[2],info[3].ic||0,info[3].p?'M'+info[3].p+'Z':''];}}
 for(const [name,variant] of Object.entries(data))if(name!=='normal')for(const char of Object.keys(variant))if(JSON.stringify(variant[char])===JSON.stringify(data.normal[char]))delete variant[char];
 const paths=[],ids=new Map();for(const variant of Object.values(data))for(const metric of Object.values(variant)){const outline=metric[4];if(!ids.has(outline)){ids.set(outline,paths.length);paths.push(outline);}metric[4]=ids.get(outline);}
 const output=JSON.stringify({paths,variants:data})+'\n',file=path.resolve(__dirname,'../../packages/vlx/font/glyphs.json');if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw Error('Font data differs')}else fs.writeFileSync(file,output);
 console.log(Buffer.byteLength(output)+' bytes of extracted outline/metric data; '+crypto.createHash('sha256').update(output).digest('hex'));
})().catch(error=>{console.error(error);process.exitCode=1});
