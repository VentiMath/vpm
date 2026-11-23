import {PNG, type ReadOptions, type WriteOptions} from 'vpngjs';
const options: ReadOptions = {checkCRC: true, maxPixels: 16000000, maxBytes: 10485760};
const image: PNG = PNG.sync.read(new Uint8Array(), options);
const pixels: Uint8Array = image.data;
const dimensions: [number, number] = [image.width, image.height];
const depth: number = image.depth;
const fixture: PNG = new PNG({width: 4, height: 3});
fixture.data.fill(255);
const writing: WriteOptions = {maxPixels: 12, maxBytes: 1024};
const encoded: Uint8Array = PNG.sync.write(fixture, writing);
PNG.sync.write({width: 2, height: 1, data: new Uint8Array(8)});
// @ts-expect-error the reader accepts bytes, not paths
PNG.sync.read('image.png');
// @ts-expect-error construction requires explicit dimensions; no stream parser
new PNG();
// @ts-expect-error data must be bytes
PNG.sync.write({width: 2, height: 1, data: 'pixels'});
// @ts-expect-error other encoding modes are outside the fixture contract
PNG.sync.write(fixture, {bitDepth: 16});
// @ts-expect-error no streaming packer
fixture.pack();
void [pixels, dimensions, depth, encoded];
