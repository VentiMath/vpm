import {Buffer} from 'node:buffer';
import {PNG, type ReadOptions} from 'vpngjs';
const options: ReadOptions = {checkCRC: true, maxPixels: 16000000, maxBytes: 10485760};
const image: PNG = PNG.sync.read(Buffer.from([]), options);
const pixels: Uint8Array = image.data;
const dimensions: [number, number] = [image.width, image.height];
// @ts-expect-error the reader accepts bytes, not paths
PNG.sync.read('image.png');
// @ts-expect-error writing is outside the application scope
PNG.sync.write(image);
// @ts-expect-error no streaming constructor
new PNG();
void [pixels, dimensions];
