'use strict';
// Synthetic pen strokes and paper, not copied student handwriting.
function paper({lines=8,columns=24,curves=true}={}){
 const width=1100,height=lines*52+80,paths=[];
 for(let l=0;l<lines;l++)for(let c=0;c<columns;c++){
  const x=100+c*35,y=40+l*52;
  paths.push(`<path d="M${x} ${y+20}${curves?`Q${x+5} ${y-8} ${x+10} ${y+10}Q${x+15} ${y+30} ${x+20} ${y}`:`L${x+8} ${y}L${x+20} ${y+20}`}" stroke-width="2.18"/>`);
 }
 const rules=Array.from({length:lines},(_,i)=>`M0 ${60.5+i*52}H${width}`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fbfcfe"/><path d="${rules}" stroke="#b3c7e3" stroke-width="1" fill="none"/><path d="M80.5 0V${height}" stroke="#e58a9f" stroke-width="1" fill="none"/><g fill="none" stroke="#1b2757" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g></svg>`;
}
module.exports={paper};
