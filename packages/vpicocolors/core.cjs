'use strict';
// SGR numbers are terminal protocol data, not imported package implementation.
const styles={reset:[0,0],bold:[1,22],dim:[2,22],italic:[3,23],underline:[4,24],inverse:[7,27],hidden:[8,28],strikethrough:[9,29]};
const names=['black','red','green','yellow','blue','magenta','cyan','white'];
for(let n=0;n<8;n++)styles[names[n]]=[30+n,39];
styles.gray=[90,39];
for(let n=0;n<8;n++)styles['bg'+names[n][0].toUpperCase()+names[n].slice(1)]=[40+n,49];
for(let n=0;n<8;n++)styles[names[n]+'Bright']=[90+n,39];
for(let n=0;n<8;n++)styles['bg'+names[n][0].toUpperCase()+names[n].slice(1)+'Bright']=[100+n,49];
const plain=value=>''+value;
function formatter(open,close,resume){
 return value=>{const text=''+value;return open+(text.indexOf(close)<0?text:text.replaceAll(close,resume))+close};
}
function createColors(enabled){
 const result={isColorSupported:!!enabled};
 for(const [name,[start,end]]of Object.entries(styles)){
  if(!enabled){result[name]=plain;continue;}
  const open='\x1b['+start+'m',close='\x1b['+end+'m',resume=end===22?close+open:open;
  result[name]=formatter(open,close,resume);
 }
 return result;
}
module.exports={createColors};
