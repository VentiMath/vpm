import React from 'react';
import {renderToString} from 'react-dom/server';
import {Accordion,AccordionSummary,AccordionDetails} from '@buttons';

export function prepare(kind) {
  const panels=Array.from({length:8},(_,i)=>
    <Accordion key={i} defaultExpanded={kind==='warml'} disableGutters={kind!=='warml'} elevation={kind==='article'?0:1}>
      <AccordionSummary expandIcon={<span>⌄</span>}>Contest information</AccordionSummary>
      <AccordionDetails sx={kind==='hmmt'?{p:0}:undefined}>Registration and results</AccordionDetails>
    </Accordion>);
  return ()=>renderToString(<>{panels}</>);
}
