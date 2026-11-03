import type {Renderer,MathOptions} from './index';
export declare function renderPng(renderer:Renderer,tex:string,options?:MathOptions & {scale?:number;background?:'white'|'transparent'}):Promise<{data:Uint8Array;width:number;height:number}>;
