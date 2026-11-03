export interface PNG {
  width: number;
  height: number;
  data: Uint8Array;
  depth: number;
  interlace: boolean;
  palette: boolean | number[][];
  color: boolean;
  alpha: boolean;
  bpp: number;
  colorType: number;
  gamma: number;
  transColor?: number[];
}
export interface ReadOptions {checkCRC?: boolean; maxPixels?: number; maxBytes?: number;}
export declare const PNG: {sync: {read(input: Uint8Array, options?: ReadOptions): PNG}};
declare const api: {PNG: typeof PNG};
export default api;
