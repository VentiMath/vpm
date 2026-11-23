"use strict";
// Exact archives; at most two independent production browser fixtures at once.
const {spawn}=require("node:child_process"),path=require("node:path");
const contracts=["contract.cjs", "text-contract.cjs", "surfaces-contract.cjs", "forms-contract.cjs", "input-contract.cjs", "input-variants-contract.cjs", "input-decorations-contract.cjs", "text-field-contract.cjs", "lists-contract.cjs", "select-contract.cjs", "checkbox-contract.cjs", "radio-contract.cjs", "switch-contract.cjs", "chip-contract.cjs", "avatar-contract.cjs", "progress-contract.cjs", "skeleton-contract.cjs", "container-contract.cjs", "cards-contract.cjs", "card-action-contract.cjs", "avatar-group-contract.cjs", "tooltip-contract.cjs", "collapse-contract.cjs", "dialog-parts-contract.cjs", "dialog-contract.cjs", "slide-contract.cjs", "drawer-contract.cjs", "swipeable-drawer-contract.cjs", "tables-contract.cjs", "navigation-contract.cjs", "linear-contract.cjs", "alert-contract.cjs", "badge-contract.cjs", "list-button-contract.cjs", "bars-contract.cjs", "accordion-parts-contract.cjs", "accordion-contract.cjs", "tabs-contract.cjs", "breadcrumbs-contract.cjs", "snackbar-contract.cjs", "stack-contract.cjs", "grid-contract.cjs", "rating-contract.cjs", "globals-contract.cjs", "click-away-contract.cjs", "grow-contract.cjs", "popper-contract.cjs", "slider-contract.cjs", "steps-contract.cjs", "step-content-contract.cjs", "list-item-contract.cjs", "css-baseline-contract.cjs", "colors-contract.cjs", "color-exports-contract.cjs", "color-types.cjs", "palette-contract.cjs", "typography-contract.cjs", "transitions-contract.cjs", "theme-contract.cjs", "autocomplete-contract.cjs", "consumer-gaps-contract.cjs"];
const browsers=["theme-browser.cjs","browser.cjs", "text-browser.cjs", "surfaces-browser.cjs", "forms-browser.cjs", "input-browser.cjs", "input-variants-browser.cjs", "input-decorations-browser.cjs", "text-field-browser.cjs", "lists-browser.cjs", "menus-browser.cjs", "select-browser.cjs", "checkbox-browser.cjs", "radio-browser.cjs", "switch-browser.cjs", "chip-browser.cjs", "avatar-browser.cjs", "progress-browser.cjs", "skeleton-browser.cjs", "container-browser.cjs", "cards-browser.cjs", "card-action-browser.cjs", "avatar-group-browser.cjs", "tooltip-browser.cjs", "collapse-browser.cjs", "dialog-parts-browser.cjs", "dialog-browser.cjs", "slide-browser.cjs", "drawer-browser.cjs", "swipeable-drawer-browser.cjs", "tables-browser.cjs", "navigation-browser.cjs", "linear-browser.cjs", "alert-browser.cjs", "badge-browser.cjs", "list-button-browser.cjs", "bars-browser.cjs", "accordion-parts-browser.cjs", "accordion-browser.cjs", "tabs-browser.cjs", "breadcrumbs-browser.cjs", "snackbar-browser.cjs", "stack-browser.cjs", "grid-browser.cjs", "rating-browser.cjs", "globals-browser.cjs", "click-away-browser.cjs", "grow-browser.cjs", "popper-browser.cjs", "slider-browser.cjs", "steps-browser.cjs", "step-content-browser.cjs", "list-item-browser.cjs", "css-baseline-browser.cjs", "autocomplete-browser.cjs", "consumer-gaps-browser.cjs"];
async function run(runtime,file,extra={}) {
 console.log(runtime+": "+file);
 const child=spawn(runtime,[path.join(__dirname,file)],{cwd:path.resolve(__dirname,"../.."),env:{...process.env,...extra},stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="",timedOut=false;
 child.stdout.on("data",s=>stdout+=s);child.stderr.on("data",s=>stderr+=s);
 const timer=setTimeout(()=>{timedOut=true;child.kill("SIGTERM")},300000);
 const code=await new Promise((resolve,reject)=>{child.once("error",reject);child.once("exit",resolve)}).finally(()=>clearTimeout(timer));
 process.stdout.write(stdout);
 if(code!==0||timedOut){process.stderr.write(stderr);throw Error(file+": "+(timedOut?"timed out":"exit "+code));}
 console.log("PASS "+runtime+": "+file);
}
(async()=>{
// A bounded runner may be resumed on the same archives after interruption.
// The caller must retain the preceding successful log; this invocation reports
// only its selected coverage and never claims the skipped checks ran again.
const resume=process.env.VPM_RELEASE_BROWSER_FROM;
if(resume&&!browsers.includes(resume))throw Error("Unknown resume browser "+resume);
if(!resume)for(const runtime of ["node","bun"])for(const file of contracts)await run(runtime,file);
const selected=resume?browsers.slice(browsers.indexOf(resume)):browsers;
const jobs=Number(process.env.VPM_MATERIAL_BROWSER_JOBS||2);
if(!Number.isInteger(jobs)||jobs<1||jobs>2)throw Error("Browser concurrency must be 1 or 2");
let next=0,failure;
await Promise.all(Array.from({length:jobs},async()=>{
 while(!failure&&next<selected.length){const file=selected[next++];try{await run("node",file)}catch(error){failure=error}}
}));
if(failure)throw failure;
for(const file of ["theme-browser.cjs","text-field-browser.cjs","select-browser.cjs","dialog-browser.cjs","consumer-gaps-browser.cjs"])await run("node",file,{VPM_REACT_MODE:"development"});
console.log("Exact Material archives: "+(resume?0:contracts.length)+" contracts on Node/Bun, "+selected.length+" production and 5 development Chrome checks pass"+(resume?"; resumed at "+resume:""));
})().catch(error=>{console.error(error);process.exitCode=1});
