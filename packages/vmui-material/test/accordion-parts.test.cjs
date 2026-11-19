"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),base=require('../../../scripts/mui-material-conformance/accordion-parts-build.cjs'),M=require(base+'/current-vpm/accordion-parts-ssr.cjs');
const render=props=>M.render(props).replace(/<style[\s\S]*?<\/style>/g,'');
test('summary is a native button linked to a detail region',()=>{const s=render();assert.match(s,/<button[^>]*id="summary"/);assert.match(s,/aria-expanded="false"/);assert.match(s,/aria-controls="details"/);assert.match(s,/role="region"[^>]*aria-labelledby="summary"/)});
test('context expansion reaches content and icon classes',()=>{const s=render({expanded:true});assert.match(s,/aria-expanded="true"/);assert.match(s,/MuiAccordionSummary-content Mui-expanded/);assert.match(s,/MuiAccordionSummary-expandIconWrapper Mui-expanded/)});
test('disabled context removes the summary from tab order',()=>{const s=render({disabled:true});assert.match(s,/tabindex="-1"/);assert.match(s,/disabled=""/);assert.match(s,/Mui-disabled/)});
test('gutters, optional icons and standalone context retain semantics',()=>{assert.doesNotMatch(render({disableGutters:true,icon:false}),/MuiAccordionSummary-gutters|MuiAccordionSummary-expandIconWrapper/);assert.doesNotMatch(render({standalone:true}),/aria-expanded=/)});
test('content slot receives state without leaking ownerState to DOM',()=>{const s=render({expanded:true,slots:true});assert.match(s,/<em[^>]*data-state="true"/);assert.match(s,/data-expanded="true"/);assert.doesNotMatch(s,/ownerState=/)});
