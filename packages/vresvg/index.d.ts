/** The VentiMath handwriting subset; unsupported SVG features throw. */
export interface ResvgRenderOptions {
 fitTo?: {mode:'original'} | {mode:'width'|'height'|'zoom';value:number};
 background?: 'white'|'transparent';
}
export class RasterError extends Error {
 constructor(code:'RASTER'|'LIMIT',message:string);
 readonly code:'RASTER'|'LIMIT';
}
export class Resvg {
 constructor(svg:string|Uint8Array,options?:ResvgRenderOptions|null);
 render():RenderedImage;
}
export class RenderedImage {
 private constructor();
 readonly width:number;
 readonly height:number;
 asPng():Uint8Array;
}
