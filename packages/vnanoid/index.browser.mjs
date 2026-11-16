import engine from './engine.cjs';
const api = engine.createSecure(bytes => {
  for (let start = 0; start < bytes.length; start += 65536) globalThis.crypto.getRandomValues(bytes.subarray(start, start + 65536));
  return bytes;
});
export const {nanoid, customAlphabet, customRandom, random, urlAlphabet} = api;
