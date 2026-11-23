export interface ReadOptions {checkCRC?: boolean; maxPixels?: number; maxBytes?: number;}
export interface CreateOptions {width: number; height: number; maxPixels?: number;}
export interface WriteOptions {maxPixels?: number; maxBytes?: number;}
export interface PixelImage {width: number; height: number; data: Uint8Array; gamma?: number;}
/** Synchronous RGBA8 fixture image; not a Node stream. */
export declare class PNG {
  constructor(options: CreateOptions);
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
  static sync: {
    read(input: Uint8Array, options?: ReadOptions): PNG;
    write(image: PixelImage, options?: WriteOptions): Uint8Array;
  };
}
declare const api: {PNG: typeof PNG};
export default api;
