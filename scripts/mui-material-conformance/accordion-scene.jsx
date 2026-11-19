import React from 'react';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Accordion, AccordionSummary, AccordionDetails} from '@buttons';

export function AccordionScene({kind='hmmt', expanded, disabled=false, square=false, unmount=false,
  named=true, mode='light', slots=false, custom=false, tick=0}={}) {
  const theme=React.useMemo(()=>createTheme({palette:{mode},components:custom?{
    MuiAccordion:{styleOverrides:{root:{borderLeft:'3px solid red'},heading:{color:'#135579'}}}
  }:{}}),[mode,custom]);
  const root=React.useRef(null);
  React.useEffect(()=>{window.accordionRoot=root});
  const article=kind==='article';
  return <ThemeProvider theme={theme}><main data-tick={tick}><button id="before">Before</button><section>
    <Accordion key={expanded===undefined?'local':'controlled'} ref={root} id="panel" square={square} disabled={disabled} expanded={expanded}
      defaultExpanded={kind==='warml'} disableGutters={kind!=='warml'}
      elevation={article?0:1} onChange={(_,value)=>window.events?.push(value)}
      sx={article?{bgcolor:'background.paper','&::before':{display:'none'},borderRadius:'0 0 .5rem .5rem'}:kind==='warml'?{mb:3}:{mb:1}}
      slotProps={{transition:{unmountOnExit:unmount},heading:slots?{component:'h2'}:undefined,region:slots?state=>({'data-expanded':String(state.expanded)}):undefined}}>
      <AccordionSummary id={named?'summary':undefined} aria-controls={named?'body':undefined} expandIcon={<span>⌄</span>}
        sx={article?{minHeight:36,'& .MuiAccordionSummary-content':{my:.5}}:undefined}>Contest information</AccordionSummary>
      <AccordionDetails sx={article?{pt:0}:kind==='hmmt'?{p:0}:undefined}>
        <input id="inside" defaultValue="saved"/><table><tbody><tr><td>Results</td></tr></tbody></table>
      </AccordionDetails>
    </Accordion></section></main></ThemeProvider>;
}
export function HydrationScene(){return <Accordion defaultExpanded><AccordionSummary id="hydrated" aria-controls="details">Contest</AccordionSummary><AccordionDetails id="details">Results</AccordionDetails></Accordion>}
