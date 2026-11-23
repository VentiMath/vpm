import fs,{copy,copySync,readJSON,outputJSON,readFile,open,stat} from '../index.cjs';
const a:Promise<string>=readFile('config.txt','utf8');
const b:Promise<string>=fs.readFile('config.txt',{encoding:'utf-8'});
const c:Promise<number>=open('log','a');
const d:Promise<{ok:boolean}>=readJSON<{ok:boolean}>('config.json');
const mode:Promise<bigint>=stat('file',{bigint:true}).then(s=>s.mode);
fs.readdir('assets',{withFileTypes:true}).then(entries=>entries.filter(e=>e.isDirectory()));
copy('assets','native',{filter:async source=>source.endsWith('.js')});
copy('assets','native',{overwrite:false},error=>void error);
copySync('assets','native',{filter:source=>source.endsWith('.js')});
outputJSON('config.json',{ok:true},{spaces:'\t'});fs.readFile('file','utf8',(error,value)=>{if(value)console.log(value.toUpperCase())});
// @ts-expect-error Synchronous copies cannot await filters.
copySync('source','target',{filter:async()=>true});
// @ts-expect-error Overwrite is a boolean.
copy('source','target',{overwrite:'yes'});
// @ts-expect-error Suppressed JSON errors may yield null.
const required:Promise<{ok:boolean}>=readJSON<{ok:boolean}>('file',{throws:false});
void [a,b,c,d,mode];
