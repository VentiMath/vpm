import {Resvg,RasterError,type ResvgRenderOptions} from 'vresvg';
const options:ResvgRenderOptions={fitTo:{mode:'height',value:4800}};
const png:Uint8Array=new Resvg('<svg viewBox="0 0 100 100"></svg>',options).render().asPng();
// @ts-expect-error Fonts are not part of the handwriting contract.
new Resvg('',{font:{loadSystemFonts:true}});
void png;

const failure:Error=new RasterError('LIMIT','Too large');void failure;
